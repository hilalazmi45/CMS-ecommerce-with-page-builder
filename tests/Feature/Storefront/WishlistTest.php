<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Customers\Models\Wishlist;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWishlistProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Wishlist Test Product',
        'slug' => 'wishlist-product-'.uniqid(),
        'sku' => 'WL-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 2000,
        'sale_price' => null,
        'manage_stock' => true,
        'stock_quantity' => 5,
        'reserved_quantity' => 0,
        'backorders' => 'no',
        'stock_status' => 'instock',
    ], $overrides));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// 1. Unauthenticated toggle → redirect to login

it('unauthenticated toggle redirects to login', function () {
    $product = makeWishlistProduct();

    $this->post(route('wishlist.toggle'), ['product_id' => $product->id])
        ->assertRedirect(route('login'));
});

// 2. Authed toggle adds then second call removes

it('authenticated toggle adds then removes a wishlist row', function () {
    $user = User::factory()->create();
    $product = makeWishlistProduct();

    // First toggle — should create the row.
    $this->actingAs($user)
        ->post(route('wishlist.toggle'), ['product_id' => $product->id])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('wishlists', [
        'user_id' => $user->id,
        'product_id' => $product->id,
        'variation_id' => null,
    ]);

    // Second toggle — should delete the row.
    $this->actingAs($user)
        ->post(route('wishlist.toggle'), ['product_id' => $product->id])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('wishlists', [
        'user_id' => $user->id,
        'product_id' => $product->id,
    ]);
});

// 3. Toggle idempotency — toggling three times results in one row (add, remove, add).

it('toggle three times leaves exactly one wishlist row', function () {
    $user = User::factory()->create();
    $product = makeWishlistProduct();

    // Toggle 1 — add
    $this->actingAs($user)
        ->post(route('wishlist.toggle'), ['product_id' => $product->id]);

    expect(Wishlist::where('user_id', $user->id)->where('product_id', $product->id)->count())->toBe(1);

    // Toggle 2 — remove
    $this->actingAs($user)
        ->post(route('wishlist.toggle'), ['product_id' => $product->id]);

    expect(Wishlist::where('user_id', $user->id)->where('product_id', $product->id)->count())->toBe(0);

    // Toggle 3 — add again
    $this->actingAs($user)
        ->post(route('wishlist.toggle'), ['product_id' => $product->id]);

    expect(Wishlist::where('user_id', $user->id)->where('product_id', $product->id)->count())->toBe(1);
});

// 4. Index shows only the user's items

it('wishlist index shows only the authenticated user items', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $product = makeWishlistProduct();

    Wishlist::create(['user_id' => $userA->id, 'product_id' => $product->id, 'variation_id' => null]);
    Wishlist::create(['user_id' => $userB->id, 'product_id' => $product->id, 'variation_id' => null]);

    $response = $this->actingAs($userA)
        ->get(route('account.wishlist'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->component('Storefront/Account/Wishlist')
        ->has('items', 1)
        ->where('items.0.product_id', $product->id)
    );
});

// 5. Removing another user's wishlist row returns 403

it('destroying another user wishlist row returns 403', function () {
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $product = makeWishlistProduct();

    $wishlist = Wishlist::create([
        'user_id' => $userA->id,
        'product_id' => $product->id,
        'variation_id' => null,
    ]);

    $this->actingAs($userB)
        ->delete(route('account.wishlist.destroy', ['wishlist' => $wishlist->id]))
        ->assertForbidden();

    $this->assertModelExists($wishlist);
});

// 6. Shared prop wishlist.count reflects the user's items

it('shared wishlist prop count equals the number of user wishlist rows', function () {
    $user = User::factory()->create();

    $productA = makeWishlistProduct();
    $productB = makeWishlistProduct();

    Wishlist::create(['user_id' => $user->id, 'product_id' => $productA->id, 'variation_id' => null]);
    Wishlist::create(['user_id' => $user->id, 'product_id' => $productB->id, 'variation_id' => null]);

    $response = $this->actingAs($user)
        ->get(route('account.wishlist'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page->where('wishlist.count', 2)
        ->has('wishlist.product_ids', 2)
    );
});

// 7. Compare page returns 200 with requested products

it('compare page loads active products by id query', function () {
    $product = makeWishlistProduct();

    $this->get(route('compare.index', ['ids' => (string) $product->id]))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Storefront/Compare')
            ->has('products', 1)
            ->where('products.0.id', $product->id)
        );
});

// 8. Compare page with no ids returns empty products

it('compare page with no ids returns empty products array', function () {
    $this->get(route('compare.index'))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Storefront/Compare')
            ->has('products', 0)
        );
});

// 9. Compare page ignores inactive products

it('compare page does not include inactive products', function () {
    $active = makeWishlistProduct();
    $inactive = makeWishlistProduct(['status' => 'draft']);

    $this->get(route('compare.index', ['ids' => "{$active->id},{$inactive->id}"]))
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->has('products', 1)
            ->where('products.0.id', $active->id)
        );
});
