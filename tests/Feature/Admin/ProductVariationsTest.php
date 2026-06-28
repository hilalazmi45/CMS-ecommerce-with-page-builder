<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductAttribute;
use App\Domain\Catalogue\Models\ProductAttributeValue;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create an admin user with the given permission codes.
 */
function productAdminWith(string ...$codes): User
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
 * Create a minimal variable product (no variations).
 */
function makeVariableProduct(): Product
{
    return Product::create([
        'name' => 'Test Variable '.uniqid(),
        'slug' => 'test-var-'.uniqid(),
        'type' => 'variable',
        'status' => 'draft',
        'manage_stock' => false,
        'stock_quantity' => null,
        'backorders' => 'no',
    ]);
}

/**
 * Create a product attribute with the given values.
 *
 * @param  string[]  $values
 */
function makeAttribute(string $name, array $values): ProductAttribute
{
    $attr = ProductAttribute::create([
        'name' => $name,
        'slug' => Str::slug($name).'-'.uniqid(),
        'type' => 'select',
        'is_global' => true,
    ]);

    foreach ($values as $i => $val) {
        ProductAttributeValue::create([
            'attribute_id' => $attr->id,
            'value' => $val,
            'slug' => Str::slug($val).'-'.$i,
            'sort_order' => $i,
        ]);
    }

    return $attr->load('values');
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

test('unauthenticated POST to products store is redirected', function () {
    $this->post(route('admin.products.store'), [])->assertRedirect(route('login'));
});

test('user without catalogue.create is forbidden from store', function () {
    $user = productAdminWith('catalogue.view');
    $this->actingAs($user)
        ->post(route('admin.products.store'), ['name' => 'X', 'type' => 'simple', 'status' => 'draft'])
        ->assertForbidden();
});

test('unauthenticated PATCH to products update is redirected', function () {
    $product = makeVariableProduct();
    $this->patch(route('admin.products.update', $product->ulid), [])
        ->assertRedirect(route('login'));
});

test('user without catalogue.update is forbidden from update', function () {
    $user = productAdminWith('catalogue.view');
    $product = makeVariableProduct();

    $this->actingAs($user)
        ->patch(route('admin.products.update', $product->ulid), [
            'name' => 'X',
            'type' => 'variable',
            'status' => 'draft',
        ])
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// Validation — store
// ---------------------------------------------------------------------------

test('store validates required fields', function () {
    $user = productAdminWith('catalogue.create');

    $this->actingAs($user)
        ->post(route('admin.products.store'), [])
        ->assertSessionHasErrors(['name', 'type', 'status']);
});

test('store validates variations.*.regular_price must be non-negative integer', function () {
    $user = productAdminWith('catalogue.create');

    $this->actingAs($user)
        ->post(route('admin.products.store'), [
            'name' => 'Var Prod',
            'type' => 'variable',
            'status' => 'draft',
            'variations' => [
                [
                    'attribute_values' => [],
                    'regular_price' => -50,
                    'is_active' => true,
                    'manage_stock' => false,
                ],
            ],
        ])
        ->assertSessionHasErrors(['variations.0.regular_price']);
});

test('store validates meta_title max 255 chars', function () {
    $user = productAdminWith('catalogue.create');

    $this->actingAs($user)
        ->post(route('admin.products.store'), [
            'name' => 'SEO Test',
            'type' => 'simple',
            'status' => 'draft',
            'meta_title' => str_repeat('x', 256),
        ])
        ->assertSessionHasErrors(['meta_title']);
});

// ---------------------------------------------------------------------------
// Creating a variable product with variations
// ---------------------------------------------------------------------------

test('creating a variable product with two variations persists both rows', function () {
    $user = productAdminWith('catalogue.create');
    $attr = makeAttribute('Size', ['S', 'M']);
    [$sVal, $mVal] = $attr->values;

    $this->actingAs($user)
        ->post(route('admin.products.store'), [
            'name' => 'Shirt',
            'type' => 'variable',
            'status' => 'draft',
            'variations' => [
                [
                    'attribute_values' => [(string) $attr->id => $sVal->id],
                    'regular_price' => 1999,
                    'sale_price' => null,
                    'sku' => 'SHIRT-S',
                    'stock_quantity' => 10,
                    'manage_stock' => true,
                    'is_active' => true,
                ],
                [
                    'attribute_values' => [(string) $attr->id => $mVal->id],
                    'regular_price' => 2199,
                    'sale_price' => null,
                    'sku' => 'SHIRT-M',
                    'stock_quantity' => 5,
                    'manage_stock' => true,
                    'is_active' => true,
                ],
            ],
        ])
        ->assertRedirect();

    $product = Product::where('name', 'Shirt')->firstOrFail();
    expect($product->type)->toBe('variable');

    $variations = $product->variations()->orderBy('sort_order')->get();
    expect($variations)->toHaveCount(2);

    expect($variations[0]->regular_price)->toBe(1999)
        ->and($variations[0]->sku)->toBe('SHIRT-S')
        ->and($variations[0]->manage_stock)->toBeTrue();

    expect($variations[1]->regular_price)->toBe(2199)
        ->and($variations[1]->sku)->toBe('SHIRT-M');
});

test('creating a product stores meta_title and meta_description', function () {
    $user = productAdminWith('catalogue.create');

    $this->actingAs($user)
        ->post(route('admin.products.store'), [
            'name' => 'SEO Product',
            'type' => 'simple',
            'status' => 'active',
            'meta_title' => 'Best Widget Ever',
            'meta_description' => 'Buy the best widget at the best price.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('products', [
        'name' => 'SEO Product',
        'meta_title' => 'Best Widget Ever',
        'meta_description' => 'Buy the best widget at the best price.',
    ]);
});

// ---------------------------------------------------------------------------
// Updating — variation sync
// ---------------------------------------------------------------------------

test('updating a variable product syncs existing and adds new variations', function () {
    $user = productAdminWith('catalogue.create', 'catalogue.update');
    $attr = makeAttribute('Color', ['Red', 'Blue']);
    [$red, $blue] = $attr->values;

    // Create product with one variation.
    $product = makeVariableProduct();
    $existingVar = ProductVariation::create([
        'product_id' => $product->id,
        'attribute_values' => [(string) $attr->id => $red->id],
        'regular_price' => 1000,
        'manage_stock' => false,
        'is_active' => true,
    ]);

    // Update: keep existing variation (with ulid) + add a new one.
    $this->actingAs($user)
        ->patch(route('admin.products.update', $product->ulid), [
            'name' => $product->name,
            'type' => 'variable',
            'status' => 'draft',
            'variations' => [
                [
                    'ulid' => $existingVar->ulid,
                    'attribute_values' => [(string) $attr->id => $red->id],
                    'regular_price' => 1500, // changed price
                    'sale_price' => null,
                    'sku' => 'RED-1',
                    'stock_quantity' => null,
                    'manage_stock' => false,
                    'is_active' => true,
                ],
                [
                    'ulid' => '',
                    'attribute_values' => [(string) $attr->id => $blue->id],
                    'regular_price' => 1800,
                    'sale_price' => null,
                    'sku' => 'BLUE-1',
                    'stock_quantity' => null,
                    'manage_stock' => false,
                    'is_active' => true,
                ],
            ],
        ])
        ->assertRedirect();

    $variations = $product->fresh()->variations()->orderBy('sort_order')->get();
    expect($variations)->toHaveCount(2);

    // Existing variation was updated (same DB id, new price).
    $updated = $variations->firstWhere('ulid', $existingVar->ulid);
    expect($updated)->not()->toBeNull()
        ->and($updated->regular_price)->toBe(1500)
        ->and($updated->sku)->toBe('RED-1');

    // New variation was created.
    $newVar = $variations->first(fn ($v) => $v->ulid !== $existingVar->ulid);
    expect($newVar)->not()->toBeNull()
        ->and($newVar->regular_price)->toBe(1800)
        ->and($newVar->sku)->toBe('BLUE-1');
});

test('updating a variable product removes variations not in the submitted list', function () {
    $user = productAdminWith('catalogue.create', 'catalogue.update');

    $product = makeVariableProduct();

    $varA = ProductVariation::create([
        'product_id' => $product->id,
        'attribute_values' => [],
        'regular_price' => 500,
        'manage_stock' => false,
        'is_active' => true,
    ]);
    $varB = ProductVariation::create([
        'product_id' => $product->id,
        'attribute_values' => [],
        'regular_price' => 700,
        'manage_stock' => false,
        'is_active' => true,
    ]);

    // Submit only varA — varB should be deleted.
    $this->actingAs($user)
        ->patch(route('admin.products.update', $product->ulid), [
            'name' => $product->name,
            'type' => 'variable',
            'status' => 'draft',
            'variations' => [
                [
                    'ulid' => $varA->ulid,
                    'attribute_values' => ['size' => 'M'], // non-empty to avoid potential null-array edge cases
                    'regular_price' => 500,
                    'sale_price' => '',
                    'sku' => '',
                    'stock_quantity' => '',
                    'manage_stock' => false,
                    'is_active' => true,
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($product->fresh()->variations()->count())->toBe(1);
    $this->assertDatabaseMissing('product_variations', ['id' => $varB->id]);
});

test('switching product type from variable to simple deletes variations', function () {
    $user = productAdminWith('catalogue.update');

    $product = makeVariableProduct();
    ProductVariation::create([
        'product_id' => $product->id,
        'attribute_values' => [],
        'regular_price' => 999,
        'manage_stock' => false,
        'is_active' => true,
    ]);

    expect($product->variations()->count())->toBe(1);

    $this->actingAs($user)
        ->patch(route('admin.products.update', $product->ulid), [
            'name' => $product->name,
            'type' => 'simple', // switched to simple
            'status' => 'draft',
        ])
        ->assertRedirect();

    expect($product->fresh()->variations()->count())->toBe(0);
});

// ---------------------------------------------------------------------------
// Gallery sort_order + is_featured
// ---------------------------------------------------------------------------

test('creating a product with image_ids sets sort_order and marks first as featured', function () {
    // We need real media records; create them directly.
    $mediaIds = [];
    foreach (range(1, 3) as $i) {
        $id = DB::table('media')->insertGetId([
            'ulid' => Str::ulid()->toString(),
            'disk' => 'local',
            'path' => "test/img{$i}.jpg",
            'file_name' => "img{$i}.jpg",
            'extension' => 'jpg',
            'mime_type' => 'image/jpeg',
            'size' => 1024,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $mediaIds[] = $id;
    }

    $user = productAdminWith('catalogue.create');

    $this->actingAs($user)
        ->post(route('admin.products.store'), [
            'name' => 'Gallery Test',
            'type' => 'simple',
            'status' => 'draft',
            'image_ids' => $mediaIds,
        ])
        ->assertRedirect();

    $product = Product::where('name', 'Gallery Test')->firstOrFail();
    $images = $product->images()->orderBy('sort_order')->get();

    expect($images)->toHaveCount(3);
    expect($images[0]->is_featured)->toBeTrue()
        ->and($images[0]->media_id)->toBe($mediaIds[0])
        ->and($images[0]->sort_order)->toBe(0);

    expect($images[1]->is_featured)->toBeFalse()
        ->and($images[1]->sort_order)->toBe(1);
});
