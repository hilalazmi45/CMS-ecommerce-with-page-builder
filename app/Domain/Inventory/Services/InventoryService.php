<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Inventory\Models\InventoryMovement;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    /**
     * Build a paginated stock table for the admin inventory page.
     *
     * Each row shape:
     *   product_id, variation_id|null, name, sku, manage_stock,
     *   on_hand, reserved, available, low_stock
     *
     * Simple products contribute one row; variable products contribute one
     * row per variation (the parent row is omitted to avoid double-counting).
     *
     * Pagination is performed at the database level over a `UNION ALL` of the
     * simple-product rows and the variable-product variation rows, so the full
     * catalogue is never materialised in PHP memory (CLAUDE.md §12.1). Only the
     * rows for the requested page are hydrated and mapped into the row shape.
     *
     * @param  array{search?: string, low_stock?: bool|string}  $filters
     */
    public function paginateStock(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $search = ! empty($filters['search']) ? '%'.$filters['search'].'%' : null;

        // ── Simple / non-variable products — one row per product (sort_group 0).
        $simple = DB::table('products')
            ->whereNull('deleted_at')
            ->where('type', '!=', 'variable')
            ->select([
                DB::raw('0 as sort_group'),
                'products.id as product_id',
                DB::raw('null as variation_id'),
                'products.name as name',
                'products.sku as sku',
                'products.manage_stock as manage_stock',
                DB::raw('coalesce(products.stock_quantity, 0) as on_hand'),
                DB::raw('coalesce(products.reserved_quantity, 0) as reserved'),
                DB::raw('(coalesce(products.stock_quantity, 0) - coalesce(products.reserved_quantity, 0)) as available'),
                DB::raw(
                    'case when products.manage_stock = 1'
                    .' and products.low_stock_amount is not null'
                    .' and (coalesce(products.stock_quantity, 0) - coalesce(products.reserved_quantity, 0)) <= products.low_stock_amount'
                    .' then 1 else 0 end as low_stock'
                ),
                DB::raw('null as attribute_values'),
            ]);

        if ($search !== null) {
            $simple->where(function ($q) use ($search): void {
                $q->where('products.name', 'like', $search)
                    ->orWhere('products.sku', 'like', $search);
            });
        }

        // ── Variable products — one row per variation (sort_group 1).
        // A variation row is included when its parent product matches the
        // search by name, sku, or any of its variations' sku — mirroring the
        // previous whereHas behaviour (all variations of a matched product).
        $variable = DB::table('product_variations as v')
            ->join('products as p', 'p.id', '=', 'v.product_id')
            ->whereNull('p.deleted_at')
            ->where('p.type', 'variable')
            ->select([
                DB::raw('1 as sort_group'),
                'p.id as product_id',
                'v.id as variation_id',
                'p.name as name',
                'v.sku as sku',
                'v.manage_stock as manage_stock',
                DB::raw('coalesce(v.stock_quantity, 0) as on_hand'),
                DB::raw('coalesce(v.reserved_quantity, 0) as reserved'),
                DB::raw('(coalesce(v.stock_quantity, 0) - coalesce(v.reserved_quantity, 0)) as available'),
                DB::raw(
                    'case when v.manage_stock = 1'
                    .' and p.low_stock_amount is not null'
                    .' and (coalesce(v.stock_quantity, 0) - coalesce(v.reserved_quantity, 0)) <= p.low_stock_amount'
                    .' then 1 else 0 end as low_stock'
                ),
                'v.attribute_values as attribute_values',
            ]);

        if ($search !== null) {
            $variable->where(function ($q) use ($search): void {
                $q->where('p.name', 'like', $search)
                    ->orWhere('p.sku', 'like', $search)
                    ->orWhereExists(function ($sub) use ($search): void {
                        $sub->select(DB::raw('1'))
                            ->from('product_variations as v2')
                            ->whereColumn('v2.product_id', 'p.id')
                            ->where('v2.sku', 'like', $search);
                    });
            });
        }

        $union = $simple->unionAll($variable);

        $query = DB::query()
            ->fromSub($union, 'stock')
            ->orderBy('sort_group')
            ->orderBy('product_id')
            ->orderBy('variation_id');

        // Low-stock filter applied over the computed column.
        if (! empty($filters['low_stock'])) {
            $query->where('low_stock', 1);
        }

        $paginator = $query->paginate($perPage)->withQueryString();

        // Map only the current page's rows into the public row shape.
        return $paginator->through(function (object $row): array {
            $row = (array) $row;
            $variationId = $row['variation_id'] !== null ? (int) $row['variation_id'] : null;

            $name = (string) $row['name'];
            if ($variationId !== null) {
                $name .= ' — '.implode(', ', array_values($this->decodeAttributeValues($row['attribute_values'] ?? null)));
            }

            return [
                'product_id' => (int) $row['product_id'],
                'variation_id' => $variationId,
                'name' => $name,
                'sku' => $row['sku'],
                'manage_stock' => (bool) $row['manage_stock'],
                'on_hand' => (int) $row['on_hand'],
                'reserved' => (int) $row['reserved'],
                'available' => (int) $row['available'],
                'low_stock' => (bool) $row['low_stock'],
            ];
        });
    }

    /**
     * Decode a variation's JSON attribute_values column into a flat array of
     * string-castable values for label composition.
     *
     * @return array<array-key, mixed>
     */
    private function decodeAttributeValues(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }

        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    public function adjust(
        Product $product,
        int $quantity,
        string $type = 'adjustment',
        ?string $note = null,
        ?ProductVariation $variation = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): InventoryMovement {
        return DB::transaction(function () use ($product, $variation, $quantity, $type, $note, $referenceType, $referenceId) {
            if ($variation) {
                $stockAfter = $variation->stock_quantity + $quantity;
                $variation->update(['stock_quantity' => $stockAfter]);
            } else {
                $stockAfter = $product->stock_quantity + $quantity;
                $product->update(['stock_quantity' => $stockAfter]);
            }

            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'variation_id' => $variation?->id,
                'type' => $type,
                'quantity' => $quantity,
                'stock_after' => $stockAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            ActivityLogger::log(
                'inventory', 'stock_adjusted',
                Product::class, $product->id,
                ['stock_quantity' => $stockAfter - $quantity],
                ['stock_quantity' => $stockAfter, 'movement_type' => $type]
            );

            return $movement;
        });
    }

    public function deduct(Product $product, int $quantity, ?ProductVariation $variation = null, ?string $referenceType = null, ?int $referenceId = null): InventoryMovement
    {
        return $this->adjust($product, -$quantity, 'sale', null, $variation, $referenceType, $referenceId);
    }

    public function restore(Product $product, int $quantity, ?ProductVariation $variation = null, ?string $referenceType = null, ?int $referenceId = null): InventoryMovement
    {
        return $this->adjust($product, $quantity, 'return', null, $variation, $referenceType, $referenceId);
    }

    // ─── Reservation lifecycle ──────────────────────────────────────────────
    //
    // Stock has three quantities:
    //   on_hand   = stock_quantity (physically held)
    //   reserved  = reserved_quantity (held for pending/processing orders)
    //   available = on_hand - reserved
    //
    // reserve() holds stock for an in-flight order; release() frees it (payment
    // failure/cancellation); commit() converts a reservation into a real stock
    // deduction (fulfilment). Each operation locks the row for update and writes
    // an immutable InventoryMovement. The `quantity` column records the change to
    // *reserved* units for reserve/release and to *on-hand* units for commit;
    // `stock_after` is always the resulting on-hand quantity.
    //
    // Callers reserving multiple lines should iterate items in a stable id order
    // to avoid deadlocks.

    public function reserve(Product $product, int $quantity, ?ProductVariation $variation = null, ?string $referenceType = null, ?int $referenceId = null): InventoryMovement
    {
        $this->assertPositive($quantity);

        return DB::transaction(function () use ($product, $variation, $quantity, $referenceType, $referenceId) {
            $target = $this->lockTarget($product, $variation);

            $onHand = (int) ($target->stock_quantity ?? 0);
            $reserved = (int) ($target->reserved_quantity ?? 0);

            // Enforce availability only when stock is managed and backorders are off.
            if ($target->manage_stock && ($target->backorders ?? 'no') === 'no') {
                $available = $onHand - $reserved;
                if ($available < $quantity) {
                    throw InsufficientStockException::for($quantity, $available);
                }
            }

            $target->reserved_quantity = $reserved + $quantity;
            $target->save();

            return $this->recordMovement($product, $variation, 'reserve', $quantity, $onHand, $referenceType, $referenceId);
        });
    }

    public function release(Product $product, int $quantity, ?ProductVariation $variation = null, ?string $referenceType = null, ?int $referenceId = null): InventoryMovement
    {
        $this->assertPositive($quantity);

        return DB::transaction(function () use ($product, $variation, $quantity, $referenceType, $referenceId) {
            $target = $this->lockTarget($product, $variation);

            $reserved = (int) ($target->reserved_quantity ?? 0);
            if ($quantity > $reserved) {
                throw new InvalidArgumentException("Cannot release {$quantity} units; only {$reserved} reserved.");
            }

            $target->reserved_quantity = $reserved - $quantity;
            $target->save();

            $onHand = (int) ($target->stock_quantity ?? 0);

            return $this->recordMovement($product, $variation, 'release', -$quantity, $onHand, $referenceType, $referenceId);
        });
    }

    public function commit(Product $product, int $quantity, ?ProductVariation $variation = null, ?string $referenceType = null, ?int $referenceId = null): InventoryMovement
    {
        $this->assertPositive($quantity);

        return DB::transaction(function () use ($product, $variation, $quantity, $referenceType, $referenceId) {
            $target = $this->lockTarget($product, $variation);

            $reserved = (int) ($target->reserved_quantity ?? 0);
            if ($quantity > $reserved) {
                throw new InvalidArgumentException("Cannot commit {$quantity} units; only {$reserved} reserved.");
            }

            $target->reserved_quantity = $reserved - $quantity;

            // Fulfilment reduces physical on-hand stock (only when it is tracked).
            if ($target->stock_quantity !== null) {
                $target->stock_quantity = (int) $target->stock_quantity - $quantity;
            }

            $target->save();

            $stockAfter = (int) ($target->stock_quantity ?? 0);

            return $this->recordMovement($product, $variation, 'commit', -$quantity, $stockAfter, $referenceType, $referenceId);
        });
    }

    /** Lock the concrete stock-bearing row (variation if given, else product) for update. */
    private function lockTarget(Product $product, ?ProductVariation $variation): Product|ProductVariation
    {
        if ($variation) {
            return ProductVariation::query()->whereKey($variation->id)->lockForUpdate()->firstOrFail();
        }

        return Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
    }

    private function recordMovement(
        Product $product,
        ?ProductVariation $variation,
        string $type,
        int $quantity,
        int $stockAfter,
        ?string $referenceType,
        ?int $referenceId,
    ): InventoryMovement {
        return InventoryMovement::create([
            'product_id' => $product->id,
            'variation_id' => $variation?->id,
            'type' => $type,
            'quantity' => $quantity,
            'stock_after' => $stockAfter,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'created_by' => Auth::id(),
        ]);
    }

    private function assertPositive(int $quantity): void
    {
        if ($quantity < 1) {
            throw new InvalidArgumentException("Quantity must be at least 1, got {$quantity}.");
        }
    }
}
