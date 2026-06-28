<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Inventory\Models\InventoryMovement;
use App\Domain\Inventory\Services\InventoryService;

/**
 * Note: true parallel-request races are enforced at runtime by lockForUpdate
 * inside each transaction; SQLite cannot reproduce concurrent connections in a
 * single test process, so these tests assert the logical invariant — available
 * stock is never oversold — via sequential exhaustion.
 */
function stockedProduct(int $onHand, bool $manage = true, string $backorders = 'no'): Product
{
    return Product::create([
        'name' => 'Widget',
        'slug' => 'widget-'.uniqid(),
        'sku' => 'SKU-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'manage_stock' => $manage,
        'stock_quantity' => $onHand,
        'reserved_quantity' => 0,
        'backorders' => $backorders,
    ]);
}

it('reserves stock and records a movement', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);

    $movement = $service->reserve($product, 3);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(3)
        ->and($product->stock_quantity)->toBe(10) // on-hand unchanged
        ->and($movement->type)->toBe('reserve');

    $this->assertDatabaseHas('inventory_movements', [
        'product_id' => $product->id,
        'type' => 'reserve',
    ]);
});

it('cannot oversell available stock', function () {
    $service = new InventoryService;
    $product = stockedProduct(5);

    $service->reserve($product, 4); // available now 1

    expect(fn () => $service->reserve($product, 2))
        ->toThrow(InsufficientStockException::class);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(4); // failed reserve did not change state
});

it('allows reserving up to exactly the available quantity', function () {
    $service = new InventoryService;
    $product = stockedProduct(5);

    $service->reserve($product, 5);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(5);
});

it('permits backorders beyond on-hand when enabled', function () {
    $service = new InventoryService;
    $product = stockedProduct(2, manage: true, backorders: 'yes');

    $service->reserve($product, 10);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(10);
});

it('does not cap reservations when stock is not managed', function () {
    $service = new InventoryService;
    $product = stockedProduct(0, manage: false);

    $service->reserve($product, 99);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(99);
});

it('releases reserved stock back to available', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);
    $service->reserve($product, 6);

    $movement = $service->release($product, 4);

    $product->refresh();
    expect($product->reserved_quantity)->toBe(2)
        ->and($product->stock_quantity)->toBe(10)
        ->and($movement->type)->toBe('release');
});

it('cannot release more than is reserved', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);
    $service->reserve($product, 3);

    expect(fn () => $service->release($product, 5))
        ->toThrow(InvalidArgumentException::class);
});

it('commits a reservation by deducting on-hand exactly once', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);
    $service->reserve($product, 4);

    $movement = $service->commit($product, 4);

    $product->refresh();
    expect($product->stock_quantity)->toBe(6)   // on-hand reduced by 4
        ->and($product->reserved_quantity)->toBe(0) // reservation consumed
        ->and($movement->type)->toBe('commit');

    // available = 6 - 0 = 6 (was 10 - 4 = 6 before commit) — unchanged across commit
});

it('cannot commit more than is reserved', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);
    $service->reserve($product, 2);

    expect(fn () => $service->commit($product, 5))
        ->toThrow(InvalidArgumentException::class);
});

it('rejects a non-positive reservation quantity', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);

    expect(fn () => $service->reserve($product, 0))
        ->toThrow(InvalidArgumentException::class);
});

it('writes an immutable movement row for each reservation operation', function () {
    $service = new InventoryService;
    $product = stockedProduct(10);

    $service->reserve($product, 5);
    $service->release($product, 2);
    $service->commit($product, 3);

    $movements = InventoryMovement::where('product_id', $product->id)
        ->pluck('type')
        ->all();

    expect($movements)->toContain('reserve')
        ->toContain('release')
        ->toContain('commit')
        ->and(count($movements))->toBe(3);
});
