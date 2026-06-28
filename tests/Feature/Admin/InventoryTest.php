<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a user with exactly the given permission codes via a fresh role.
 * Mirrors the pattern from RoleManagementTest without relying on that file's
 * global function (Pest does not share globals across test files).
 */
function inventoryAdminWithPermissions(string ...$codes): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 2]);

    foreach ($codes as $code) {
        $perm = Permission::factory()->code($code)->create();
        $role->permissions()->attach($perm);
    }

    $user->roles()->attach($role);

    return $user;
}

/**
 * Create a simple managed-stock product row directly (no factory available).
 */
function invSimpleProduct(int $onHand = 10, int $reserved = 0): Product
{
    $product = Product::create([
        'name' => 'Inv Test Widget '.uniqid(),
        'slug' => 'inv-widget-'.uniqid(),
        'sku' => 'INV-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'manage_stock' => true,
        'stock_quantity' => $onHand,
        'reserved_quantity' => $reserved,
        'backorders' => 'no',
    ]);

    // Use the actual DB column name (low_stock_amount), not the model fillable alias.
    $product->getConnection()
        ->table('products')
        ->where('id', $product->id)
        ->update(['low_stock_amount' => 2]);

    return $product->fresh();
}

/**
 * Create a variable product with one variation.
 */
function invVariableProductWithVariation(int $varOnHand = 5): array
{
    $product = Product::create([
        'name' => 'Var Product '.uniqid(),
        'slug' => 'var-product-'.uniqid(),
        'sku' => null,
        'type' => 'variable',
        'status' => 'active',
        'manage_stock' => false,
        'stock_quantity' => 0,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ]);

    $variation = ProductVariation::create([
        'product_id' => $product->id,
        'sku' => 'VAR-'.uniqid(),
        'regular_price' => 1000,
        'manage_stock' => true,
        'stock_quantity' => $varOnHand,
        'reserved_quantity' => 0,
        'attribute_values' => ['size' => 'M'],
        'is_active' => true,
    ]);

    return [$product, $variation];
}

// ---------------------------------------------------------------------------
// Tests — index endpoint
// ---------------------------------------------------------------------------

test('unauthenticated request is redirected from inventory index', function () {
    $this->get(route('admin.inventory.index'))
        ->assertRedirect(route('login'));
});

test('user without inventory.view gets 403 on inventory index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.inventory.index'))
        ->assertForbidden();
});

test('user with inventory.view gets 200 and correct Inertia component', function () {
    $user = inventoryAdminWithPermissions('inventory.view');
    invSimpleProduct();

    $this->actingAs($user)
        ->get(route('admin.inventory.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Inventory/Index')
            ->has('rows')
            ->has('filters')
        );
});

test('inventory index paginates more than one page of SKUs at 20 per page', function () {
    $user = inventoryAdminWithPermissions('inventory.view');

    // Seed 25 simple products → 25 rows, which must span two pages of 20.
    foreach (range(1, 25) as $i) {
        invSimpleProduct(onHand: 10);
    }

    // Page 1: 20 rows, total 25.
    $this->actingAs($user)
        ->get(route('admin.inventory.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Inventory/Index')
            ->where('rows.total', 25)
            ->where('rows.per_page', 20)
            ->where('rows.current_page', 1)
            ->where('rows.last_page', 2)
            ->count('rows.data', 20)
        );

    // Page 2: remaining 5 rows.
    $this->actingAs($user)
        ->get(route('admin.inventory.index', ['page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Inventory/Index')
            ->where('rows.total', 25)
            ->where('rows.current_page', 2)
            ->count('rows.data', 5)
        );
});

test('inventory index paginates variation rows and respects the search filter', function () {
    $user = inventoryAdminWithPermissions('inventory.view');

    // 22 variable products, each contributing one variation row.
    foreach (range(1, 22) as $i) {
        invVariableProductWithVariation(varOnHand: 5);
    }
    [$named] = invVariableProductWithVariation(varOnHand: 5);
    $named->update(['name' => 'Uniquely Named Variable']);

    // Unfiltered: 23 variation rows across two pages.
    $this->actingAs($user)
        ->get(route('admin.inventory.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rows.total', 23)
            ->count('rows.data', 20)
        );

    // Search by parent product name returns only that product's variation rows.
    $this->actingAs($user)
        ->get(route('admin.inventory.index', ['search' => 'Uniquely Named']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rows.total', 1)
            ->count('rows.data', 1)
            ->where('rows.data.0.name', fn ($name) => str_contains((string) $name, 'Uniquely Named Variable'))
        );
});

// ---------------------------------------------------------------------------
// Tests — adjust endpoint
// ---------------------------------------------------------------------------

test('unauthenticated request is redirected from inventory adjust', function () {
    $product = invSimpleProduct();

    $this->post(route('admin.inventory.adjust'), [
        'product_id' => $product->id,
        'delta' => 5,
    ])->assertRedirect(route('login'));
});

test('user without inventory.adjust gets 403 on POST adjust', function () {
    $user = inventoryAdminWithPermissions('inventory.view');
    $product = invSimpleProduct();

    $this->actingAs($user)
        ->post(route('admin.inventory.adjust'), [
            'product_id' => $product->id,
            'delta' => 5,
        ])
        ->assertForbidden();
});

test('user with inventory.adjust can increase stock by 5', function () {
    $user = inventoryAdminWithPermissions('inventory.adjust');
    $product = invSimpleProduct(onHand: 10);

    $this->actingAs($user)
        ->post(route('admin.inventory.adjust'), [
            'product_id' => $product->id,
            'delta' => 5,
            'note' => 'restock',
        ])
        ->assertRedirect();

    $product->refresh();
    expect($product->stock_quantity)->toBe(15);

    $this->assertDatabaseHas('inventory_movements', [
        'product_id' => $product->id,
        'type' => 'adjustment',
        'quantity' => 5,
        'stock_after' => 15,
        'note' => 'restock',
    ]);
});

test('delta of zero returns 422 validation error', function () {
    $user = inventoryAdminWithPermissions('inventory.adjust');
    $product = invSimpleProduct();

    $this->actingAs($user)
        ->post(route('admin.inventory.adjust'), [
            'product_id' => $product->id,
            'delta' => 0,
        ])
        ->assertSessionHasErrors(['delta']);
});

test('variation adjustment updates the variation stock not the parent product', function () {
    $user = inventoryAdminWithPermissions('inventory.adjust');
    [$product, $variation] = invVariableProductWithVariation(varOnHand: 8);

    $parentStockBefore = $product->stock_quantity;

    $this->actingAs($user)
        ->post(route('admin.inventory.adjust'), [
            'product_id' => $product->id,
            'variation_id' => $variation->id,
            'delta' => 3,
            'note' => 'variation restock',
        ])
        ->assertRedirect();

    $variation->refresh();
    $product->refresh();

    expect($variation->stock_quantity)->toBe(11)
        ->and($product->stock_quantity)->toBe($parentStockBefore);

    $this->assertDatabaseHas('inventory_movements', [
        'product_id' => $product->id,
        'variation_id' => $variation->id,
        'type' => 'adjustment',
        'quantity' => 3,
        'stock_after' => 11,
    ]);
});
