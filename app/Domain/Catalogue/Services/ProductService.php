<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Services;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductService
{
    public function paginate(int $perPage = 20, array $filters = []): LengthAwarePaginator
    {
        $query = Product::query()
            ->with(['brand', 'categories'])
            ->latest();

        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                    ->orWhere('sku', 'like', "%{$filters['search']}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (! empty($filters['category_id'])) {
            $query->whereHas('categories', fn ($q) => $q->where('product_categories.id', $filters['category_id']));
        }

        return $query->paginate($perPage);
    }

    public function create(array $data): Product
    {
        return DB::transaction(function () use ($data) {
            $categories = $data['category_ids'] ?? [];
            $images = $data['image_ids'] ?? [];
            $variations = $data['variations'] ?? [];
            unset($data['category_ids'], $data['image_ids'], $data['variations']);

            $data['slug'] ??= Str::slug($data['name']);

            $product = Product::create($data);

            if ($categories) {
                $product->categories()->sync($categories);
            }

            foreach ($images as $i => $imageId) {
                $product->images()->create([
                    'media_id' => $imageId,
                    'sort_order' => $i,
                    'is_featured' => $i === 0,
                ]);
            }

            if ($product->isVariable()) {
                foreach ($variations as $i => $variationData) {
                    $product->variations()->create(array_merge(
                        $this->normaliseVariationData($variationData),
                        ['sort_order' => $i],
                    ));
                }
            }

            ActivityLogger::log('catalogue', 'product_created', Product::class, $product->id, null, $product->toArray());

            return $product->load(['categories', 'images', 'variations']);
        });
    }

    public function update(Product $product, array $data): Product
    {
        return DB::transaction(function () use ($product, $data) {
            $old = $product->toArray();
            $categories = $data['category_ids'] ?? null;
            $images = $data['image_ids'] ?? null;
            // null means "not submitted" (do not touch); [] means "submitted, clear all"
            $variationsInput = array_key_exists('variations', $data) ? ($data['variations'] ?? null) : null;
            unset($data['category_ids'], $data['image_ids'], $data['variations']);

            $product->update($data);

            if ($categories !== null) {
                $product->categories()->sync($categories);
            }

            if ($images !== null) {
                $product->images()->delete();
                foreach ($images as $i => $imageId) {
                    $product->images()->create([
                        'media_id' => $imageId,
                        'sort_order' => $i,
                        'is_featured' => $i === 0,
                    ]);
                }
            }

            // Sync variations when the product is variable and variations were submitted.
            if ($product->isVariable() && $variationsInput !== null) {
                $this->syncVariations($product, $variationsInput);
            }

            // If type switched to simple, remove all variations.
            if ($product->isSimple()) {
                $product->variations()->delete();
            }

            ActivityLogger::log('catalogue', 'product_updated', Product::class, $product->id, $old, $product->fresh()->toArray());

            return $product->fresh(['categories', 'images', 'variations']);
        });
    }

    public function delete(Product $product): void
    {
        ActivityLogger::log('catalogue', 'product_deleted', Product::class, $product->id, $product->toArray(), null);
        $product->delete();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Upsert/delete variations for a variable product.
     *
     * Each variation row may carry an existing `ulid` for update; rows without
     * a ulid (or with one not belonging to this product) are created fresh.
     * Any existing variation not present in $input is deleted.
     *
     * @param  array<int, array<string, mixed>>  $input
     */
    private function syncVariations(Product $product, array $input): void
    {
        $existingByUlid = $product->variations()
            ->pluck('id', 'ulid')
            ->all();

        $seenIds = [];

        foreach ($input as $i => $row) {
            $ulid = $row['ulid'] ?? null;

            if ($ulid && isset($existingByUlid[$ulid])) {
                // Update existing variation.
                $variation = ProductVariation::find($existingByUlid[$ulid]);
                if ($variation) {
                    $variation->update(array_merge(
                        $this->normaliseVariationData($row),
                        ['sort_order' => $i],
                    ));
                    $seenIds[] = $variation->id;
                }
            } else {
                // Create new variation.
                $variation = $product->variations()->create(array_merge(
                    $this->normaliseVariationData($row),
                    ['sort_order' => $i],
                ));
                $seenIds[] = $variation->id;
            }
        }

        // Delete any variation that was not in the submitted list.
        if ($seenIds) {
            $product->variations()->whereNotIn('id', $seenIds)->delete();
        } else {
            $product->variations()->delete();
        }
    }

    /**
     * Strip internal-only keys and normalise booleans for a variation row.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normaliseVariationData(array $row): array
    {
        return [
            'attribute_values' => $row['attribute_values'] ?? [],
            'regular_price' => (int) $row['regular_price'],
            'sale_price' => (isset($row['sale_price']) && $row['sale_price'] !== '')
                ? (int) $row['sale_price']
                : null,
            'sku' => (isset($row['sku']) && $row['sku'] !== '') ? (string) $row['sku'] : null,
            'stock_quantity' => (isset($row['stock_quantity']) && $row['stock_quantity'] !== '')
                ? (int) $row['stock_quantity']
                : null,
            'manage_stock' => (bool) ($row['manage_stock'] ?? false),
            'is_active' => (bool) ($row['is_active'] ?? true),
        ];
    }
}
