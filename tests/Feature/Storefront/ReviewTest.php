<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductReview;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Models\User;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reviewProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Review Test Product '.uniqid(),
        'slug' => 'review-product-'.uniqid(),
        'sku' => 'REV-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'sale_price' => null,
        'manage_stock' => true,
        'stock_quantity' => 5,
        'reserved_quantity' => 0,
        'backorders' => 'no',
        'stock_status' => 'instock',
    ], $overrides));
}

/**
 * Create a paid, processing order for $user that contains $product.
 */
function reviewOrderWithProduct(User $user, Product $product): Order
{
    $order = Order::create([
        'user_id' => $user->id,
        'status' => 'processing',
        'payment_status' => 'paid',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'total' => 1000,
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'name' => $product->name,
        'sku' => $product->sku,
        'quantity' => 1,
        'unit_price' => 1000,
        'subtotal' => 1000,
        'discount' => 0,
        'tax' => 0,
        'total' => 1000,
        'meta' => null,
    ]);

    return $order;
}

// ---------------------------------------------------------------------------
// 1. Guest cannot submit — redirects to login
// ---------------------------------------------------------------------------

it('guest submitting a review is redirected to login', function () {
    $product = reviewProduct();

    $this->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
        'rating' => 5,
        'body' => 'Great product!',
    ])->assertRedirect(route('login'));
});

// ---------------------------------------------------------------------------
// 2. Authenticated user can submit → review created, is_approved = false
// ---------------------------------------------------------------------------

it('authenticated user can submit a review which is created pending approval', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 4,
            'title' => 'Very good',
            'body' => 'I really liked this product.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('product_reviews', [
        'product_id' => $product->id,
        'user_id' => $user->id,
        'rating' => 4,
        'title' => 'Very good',
        'is_approved' => false,
    ]);
});

// ---------------------------------------------------------------------------
// 3. Verified purchase flag
// ---------------------------------------------------------------------------

it('is_verified_purchase is true when user has a paid order containing the product', function () {
    $user = User::factory()->create();
    $product = reviewProduct();
    reviewOrderWithProduct($user, $product);

    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 5,
            'body' => 'Excellent!',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('product_reviews', [
        'product_id' => $product->id,
        'user_id' => $user->id,
        'is_verified_purchase' => true,
    ]);
});

it('is_verified_purchase is false when user has no paid order for the product', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 3,
            'body' => 'Decent product.',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('product_reviews', [
        'product_id' => $product->id,
        'user_id' => $user->id,
        'is_verified_purchase' => false,
    ]);
});

// ---------------------------------------------------------------------------
// 4. Pending review NOT shown on product page; approved one IS
// ---------------------------------------------------------------------------

it('pending review is not returned in the product page reviews prop', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    // Create a pending (unapproved) review
    ProductReview::create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'author_name' => $user->name,
        'rating' => 5,
        'body' => 'Pending review',
        'is_approved' => false,
        'is_verified_purchase' => false,
    ]);

    $this->get(route('storefront.product', ['product' => $product->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Product')
            ->has('reviews', 0)
            ->where('reviewSummary.count', 0)
        );
});

it('approved review IS returned in the product page reviews prop', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    ProductReview::create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'author_name' => $user->name,
        'rating' => 4,
        'body' => 'Approved review',
        'is_approved' => true,
        'is_verified_purchase' => false,
    ]);

    $this->get(route('storefront.product', ['product' => $product->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Product')
            ->has('reviews', 1)
            ->where('reviews.0.body', 'Approved review')
            ->where('reviewSummary.count', 1)
            ->where('reviewSummary.average', fn ($v) => (float) $v === 4.0)
        );
});

// ---------------------------------------------------------------------------
// 5. Duplicate review by same user → rejected
// ---------------------------------------------------------------------------

it('duplicate review by same user returns a validation error', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    // First review
    ProductReview::create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'author_name' => $user->name,
        'rating' => 5,
        'body' => 'First review',
        'is_approved' => false,
        'is_verified_purchase' => false,
    ]);

    // Second review attempt by the same user
    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 4,
            'body' => 'Second review attempt',
        ])
        ->assertRedirect()
        ->assertSessionHasErrors(['review']);

    // Only one review should exist
    expect(ProductReview::where('user_id', $user->id)->where('product_id', $product->id)->count())->toBe(1);
});

// ---------------------------------------------------------------------------
// 6. Review summary only counts approved reviews
// ---------------------------------------------------------------------------

it('review summary counts only approved reviews', function () {
    $u1 = User::factory()->create();
    $u2 = User::factory()->create();
    $u3 = User::factory()->create();
    $product = reviewProduct();

    ProductReview::create([
        'product_id' => $product->id, 'user_id' => $u1->id, 'author_name' => $u1->name,
        'rating' => 5, 'body' => 'Approved', 'is_approved' => true, 'is_verified_purchase' => false,
    ]);
    ProductReview::create([
        'product_id' => $product->id, 'user_id' => $u2->id, 'author_name' => $u2->name,
        'rating' => 3, 'body' => 'Approved 2', 'is_approved' => true, 'is_verified_purchase' => false,
    ]);
    ProductReview::create([
        'product_id' => $product->id, 'user_id' => $u3->id, 'author_name' => $u3->name,
        'rating' => 1, 'body' => 'Pending', 'is_approved' => false, 'is_verified_purchase' => false,
    ]);

    $this->get(route('storefront.product', ['product' => $product->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('reviewSummary.count', 2)
            ->where('reviewSummary.average', fn ($v) => (float) $v === 4.0) // (5+3)/2
            ->has('reviews', 2)
        );
});

// ---------------------------------------------------------------------------
// 7. Validation — missing body / invalid rating
// ---------------------------------------------------------------------------

it('review submission fails with invalid rating', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 6,
            'body' => 'Some body',
        ])
        ->assertSessionHasErrors(['rating']);
});

it('review submission fails with empty body', function () {
    $user = User::factory()->create();
    $product = reviewProduct();

    $this->actingAs($user)
        ->post(route('storefront.product.reviews.store', ['product' => $product->slug]), [
            'rating' => 4,
            'body' => '',
        ])
        ->assertSessionHasErrors(['body']);
});
