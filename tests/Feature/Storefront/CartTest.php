<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Cart\Services\CartService;
use App\Domain\Catalogue\Models\Product;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a simple, in-stock product with managed stock.
 */
function makeProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Test Product',
        'slug' => 'test-product-'.uniqid(),
        'sku' => 'SKU-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000, // MYR 10.00 in sen
        'sale_price' => null,
        'manage_stock' => true,
        'stock_quantity' => 10,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

/**
 * Create a guest session and add the cart_token to the session.
 */
function guestSession(string $token): array
{
    return ['cart_token' => $token];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

it('guest can add a product to cart and item_count reflects quantity', function () {
    $product = makeProduct(['stock_quantity' => 5]);
    $token = 'guest-token-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('cart_items', [
        'product_id' => $product->id,
        'quantity' => 2,
    ]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $service = app(CartService::class);
    $summary = $service->summarize($cart);

    expect($summary['item_count'])->toBe(2);
    expect($summary['items'])->toHaveCount(1);
});

it('adding the same product twice deduplicates into one cart row', function () {
    $product = makeProduct(['stock_quantity' => 10]);
    $token = 'dedup-'.uniqid();

    $session = guestSession($token);

    $this->withSession($session)->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 2]);
    $this->withSession($session)->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 3]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();

    expect(CartItem::query()->where('cart_id', $cart->id)->count())->toBe(1);
    expect(CartItem::query()->where('cart_id', $cart->id)->first()->quantity)->toBe(5);
});

it('adding more than available stock is rejected with an error flash and no item is created', function () {
    $product = makeProduct(['stock_quantity' => 3, 'reserved_quantity' => 0]);
    $token = 'stock-limit-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), [
            'product_id' => $product->id,
            'quantity' => 5,
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    $this->assertDatabaseMissing('cart_items', ['product_id' => $product->id]);
});

it('allows adding beyond stock when backorders are enabled', function () {
    $product = makeProduct(['stock_quantity' => 2, 'backorders' => 'yes']);
    $token = 'backorders-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 10]);

    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertDatabaseHas('cart_items', ['product_id' => $product->id, 'quantity' => 10]);
});

it('allows adding beyond stock when manage_stock is false', function () {
    $product = makeProduct(['manage_stock' => false, 'stock_quantity' => 1]);
    $token = 'unmanaged-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 50]);

    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertDatabaseHas('cart_items', ['product_id' => $product->id, 'quantity' => 50]);
});

it('update quantity changes the line quantity', function () {
    $product = makeProduct(['stock_quantity' => 10]);
    $token = 'update-qty-'.uniqid();

    $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 2]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $item = CartItem::query()->where('cart_id', $cart->id)->firstOrFail();

    $response = $this->withSession(guestSession($token))
        ->patch(route('cart.items.update', $item), ['quantity' => 5]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect($item->fresh()->quantity)->toBe(5);
});

it('updating quantity beyond available stock returns error', function () {
    $product = makeProduct(['stock_quantity' => 3]);
    $token = 'update-over-'.uniqid();

    $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 2]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $item = CartItem::query()->where('cart_id', $cart->id)->firstOrFail();

    $response = $this->withSession(guestSession($token))
        ->patch(route('cart.items.update', $item), ['quantity' => 10]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    // Quantity unchanged.
    expect($item->fresh()->quantity)->toBe(2);
});

it('remove deletes the cart line', function () {
    $product = makeProduct();
    $token = 'remove-'.uniqid();

    $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 1]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $item = CartItem::query()->where('cart_id', $cart->id)->firstOrFail();

    $response = $this->withSession(guestSession($token))
        ->delete(route('cart.items.destroy', $item));

    $response->assertRedirect();
    $response->assertSessionHas('success');
    $this->assertDatabaseMissing('cart_items', ['id' => $item->id]);
});

it('clear empties the cart', function () {
    $productA = makeProduct();
    $productB = makeProduct(['slug' => 'product-b-'.uniqid(), 'sku' => 'SKU-B-'.uniqid()]);
    $token = 'clear-'.uniqid();

    $session = guestSession($token);
    $this->withSession($session)->post(route('cart.add'), ['product_id' => $productA->id, 'quantity' => 1]);
    $this->withSession($session)->post(route('cart.add'), ['product_id' => $productB->id, 'quantity' => 2]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    expect(CartItem::query()->where('cart_id', $cart->id)->count())->toBe(2);

    $response = $this->withSession($session)->delete(route('cart.clear'));

    $response->assertRedirect();
    $response->assertSessionHas('success');
    expect(CartItem::query()->where('cart_id', $cart->id)->count())->toBe(0);
});

it('prevents a user from modifying a cart item belonging to a different cart', function () {
    $product = makeProduct();
    $token = 'other-cart-'.uniqid();

    // Create another guest cart with an item.
    $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 1]);

    $otherCart = Cart::query()->where('session_id', $token)->firstOrFail();
    $otherItem = CartItem::query()->where('cart_id', $otherCart->id)->firstOrFail();

    // A different user (no cart) tries to manipulate the item.
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->patch(route('cart.items.update', $otherItem), ['quantity' => 99]);

    $response->assertStatus(403);
});

it('ignores any price field posted with add — totals come from product record', function () {
    $product = makeProduct(['regular_price' => 2000]); // MYR 20.00
    $token = 'server-price-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), [
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 1, // attacker tries to set price to 1 sen
        ]);

    $response->assertRedirect();

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $summary = app(CartService::class)->summarize($cart);

    // Unit price must be the stored regular_price, not 1.
    expect($summary['items'][0]['unit_price'])->toBe(2000);
    expect($summary['totals']['total'])->toBe(2000);
});

it('authenticated user gets their own cart keyed by user_id not session', function () {
    $product = makeProduct();
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 3]);

    $response->assertRedirect();

    // Cart is associated with user_id, not session_id.
    $cart = Cart::query()->where('user_id', $user->id)->first();
    expect($cart)->not->toBeNull();
    expect(CartItem::query()->where('cart_id', $cart->id)->first()->quantity)->toBe(3);
});

it('merges guest cart into user cart on login', function () {
    // Create a product.
    $product = makeProduct(['stock_quantity' => 20]);

    // User already has product in their cart with qty 2.
    $user = User::factory()->create();
    $userCart = Cart::create(['user_id' => $user->id]);
    CartItem::create([
        'cart_id' => $userCart->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'quantity' => 2,
    ]);

    // Guest has the same product with qty 3.
    $guestToken = 'merge-token-'.uniqid();
    $guestCart = Cart::create(['session_id' => $guestToken]);
    CartItem::create([
        'cart_id' => $guestCart->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'quantity' => 3,
    ]);

    // Log in as the user so the Login event fires.
    $this->withSession(['cart_token' => $guestToken])
        ->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

    // Guest cart should be gone.
    expect(Cart::query()->where('session_id', $guestToken)->exists())->toBeFalse();

    // User cart should have merged quantity (2 + 3 = 5).
    $userCart->refresh();
    $mergedItem = CartItem::query()->where('cart_id', $userCart->id)->first();
    expect($mergedItem)->not->toBeNull();
    expect($mergedItem->quantity)->toBe(5);
});

it('summarize returns zero totals and empty items for a null cart', function () {
    $service = app(CartService::class);
    $summary = $service->summarize(null);

    expect($summary['id'])->toBeNull();
    expect($summary['item_count'])->toBe(0);
    expect($summary['items'])->toBeEmpty();
    expect($summary['totals']['total'])->toBe(0);
});

it('totals reflect server-side prices and correct line totals', function () {
    $product = makeProduct(['regular_price' => 500]); // MYR 5.00
    $token = 'totals-'.uniqid();

    $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 4]);

    $cart = Cart::query()->where('session_id', $token)->firstOrFail();
    $summary = app(CartService::class)->summarize($cart);

    expect($summary['totals']['subtotal'])->toBe(2000); // 4 × 500 = 2000 sen
    expect($summary['totals']['total'])->toBe(2000);
    expect($summary['items'][0]['line_total'])->toBe(2000);
});

it('inactive product cannot be added to cart', function () {
    $product = makeProduct(['status' => 'draft']);
    $token = 'inactive-'.uniqid();

    $response = $this->withSession(guestSession($token))
        ->post(route('cart.add'), ['product_id' => $product->id, 'quantity' => 1]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
    $this->assertDatabaseMissing('cart_items', ['product_id' => $product->id]);
});
