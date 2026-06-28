<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Cart\Services\CartService;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Models\CouponUsage;
use App\Domain\Promotions\Services\CouponService;
use App\Models\User;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a simple in-stock product (reuses the helper from CartTest if loaded,
 * but defined here independently to keep tests self-contained).
 */
function makeCouponTestProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Coupon Test Product',
        'slug' => 'coupon-product-'.uniqid(),
        'sku' => 'CPN-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000, // MYR 10.00
        'sale_price' => null,
        'manage_stock' => false,
        'stock_quantity' => 100,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

/**
 * Create a minimal order row to attach coupon usages to (FK target).
 */
function makeCouponTestOrder(?int $userId): Order
{
    return Order::create([
        'user_id' => $userId,
        'status' => 'pending',
        'payment_status' => 'pending',
        'currency' => 'MYR',
        'total' => 0,
    ]);
}

/**
 * Create a Coupon model with sensible defaults.
 */
function makeCoupon(array $overrides = []): Coupon
{
    return Coupon::create(array_merge([
        'ulid' => Str::ulid()->toString(),
        'code' => 'TEST'.strtoupper(uniqid()),
        'type' => 'percent',
        'amount' => 1000, // 10%
        'min_spend' => null,
        'max_spend' => null,
        'usage_limit' => null,
        'usage_count' => 0,
        'per_customer_limit' => null,
        'individual_use' => false,
        'exclude_sale_items' => false,
        'allowed_emails' => null,
        'expires_at' => null,
        'is_active' => true,
    ], $overrides));
}

/**
 * Create a guest cart with one product line and return [cart, sessionToken].
 *
 * @return array{Cart, string}
 */
function makeGuestCartWithProduct(Product $product, int $quantity = 2): array
{
    $token = 'cpn-guest-'.uniqid();
    $cart = Cart::create(['session_id' => $token]);
    CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'quantity' => $quantity,
    ]);

    return [$cart, $token];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

it('applying a valid percent coupon reduces discount_total and total', function () {
    $product = makeCouponTestProduct(['regular_price' => 1000]);
    [$cart, $token] = makeGuestCartWithProduct($product, 2); // subtotal = 2000

    $coupon = makeCoupon(['type' => 'percent', 'amount' => 1000]); // 10%

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $cart->refresh();
    expect($cart->coupon_code)->toBe($coupon->code);

    $summary = app(CartService::class)->summarize($cart);

    // 10% of 2000 = 200 sen discount
    expect($summary['totals']['discount_total'])->toBe(200);
    expect($summary['totals']['total'])->toBe(1800);
    expect($summary['applied_coupon'])->not->toBeNull();
    expect($summary['applied_coupon']['valid'])->toBeTrue();
    expect($summary['applied_coupon']['discount'])->toBe(200);
});

it('applying a fixed_cart coupon caps discount at subtotal', function () {
    $product = makeCouponTestProduct(['regular_price' => 500]);
    [$cart, $token] = makeGuestCartWithProduct($product, 1); // subtotal = 500

    // Fixed coupon for 1000 — more than the subtotal of 500.
    $coupon = makeCoupon(['type' => 'fixed_cart', 'amount' => 1000]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $summary = app(CartService::class)->summarize($cart->refresh());

    // Discount capped at subtotal — total must be 0, not negative.
    expect($summary['totals']['discount_total'])->toBe(500);
    expect($summary['totals']['total'])->toBe(0);
});

it('invalid code returns error flash and cart coupon_code stays null', function () {
    $product = makeCouponTestProduct();
    [$cart, $token] = makeGuestCartWithProduct($product);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => 'DOESNOTEXIST']);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect($cart->fresh()->coupon_code)->toBeNull();
});

it('expired coupon is rejected', function () {
    $product = makeCouponTestProduct();
    [$cart, $token] = makeGuestCartWithProduct($product);

    $coupon = makeCoupon(['expires_at' => now()->subDay()]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect($cart->fresh()->coupon_code)->toBeNull();
});

it('inactive coupon is rejected', function () {
    $product = makeCouponTestProduct();
    [$cart, $token] = makeGuestCartWithProduct($product);

    $coupon = makeCoupon(['is_active' => false]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect($cart->fresh()->coupon_code)->toBeNull();
});

it('min_spend not met is rejected', function () {
    $product = makeCouponTestProduct(['regular_price' => 500]);
    [$cart, $token] = makeGuestCartWithProduct($product, 1); // subtotal = 500

    // Requires min spend of 1000 sen.
    $coupon = makeCoupon(['min_spend' => 1000]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect($cart->fresh()->coupon_code)->toBeNull();
});

it('global usage_limit reached is rejected', function () {
    $product = makeCouponTestProduct();
    [$cart, $token] = makeGuestCartWithProduct($product);

    $coupon = makeCoupon(['usage_limit' => 5, 'usage_count' => 5]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
});

it('per_customer_limit at limit is rejected for that user', function () {
    $product = makeCouponTestProduct();
    $user = User::factory()->create();
    $cart = Cart::create(['user_id' => $user->id]);
    CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->id,
        'quantity' => 1,
    ]);

    $coupon = makeCoupon(['per_customer_limit' => 2]);

    // Seed 2 existing usages for this user (recorded against orders) — limit reached.
    $order1 = makeCouponTestOrder($user->id);
    $order2 = makeCouponTestOrder($user->id);
    CouponUsage::create(['coupon_id' => $coupon->id, 'order_id' => $order1->id, 'user_id' => $user->id, 'discount_amount' => 100]);
    CouponUsage::create(['coupon_id' => $coupon->id, 'order_id' => $order2->id, 'user_id' => $user->id, 'discount_amount' => 100]);

    $response = $this->actingAs($user)
        ->post(route('cart.coupon.apply'), ['code' => $coupon->code]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect($cart->fresh()->coupon_code)->toBeNull();
});

it('removing a coupon clears it and discount returns to zero', function () {
    $product = makeCouponTestProduct(['regular_price' => 1000]);
    [$cart, $token] = makeGuestCartWithProduct($product, 1);

    $coupon = makeCoupon(['type' => 'percent', 'amount' => 2000]); // 20%

    // Apply it first.
    $cart->coupon_code = $coupon->code;
    $cart->save();

    $response = $this->withSession(['cart_token' => $token])
        ->delete(route('cart.coupon.remove'));

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect($cart->fresh()->coupon_code)->toBeNull();

    $summary = app(CartService::class)->summarize($cart->fresh());
    expect($summary['totals']['discount_total'])->toBe(0);
    expect($summary['totals']['total'])->toBe(1000);
    expect($summary['applied_coupon'])->toBeNull();
});

it('URL auto-apply via ?coupon=CODE applies the coupon when cart has items', function () {
    $product = makeCouponTestProduct(['regular_price' => 1000]);
    [$cart, $token] = makeGuestCartWithProduct($product, 2); // subtotal 2000

    $coupon = makeCoupon(['type' => 'percent', 'amount' => 500]); // 5%

    $response = $this->withSession(['cart_token' => $token])
        ->get(route('cart.index', ['coupon' => $coupon->code]));

    $response->assertOk();

    expect($cart->fresh()->coupon_code)->toBe($coupon->code);
});

it('redeem increments usage_count and writes a CouponUsage row against the order', function () {
    $coupon = makeCoupon(['usage_limit' => 10, 'usage_count' => 0]);
    $user = User::factory()->create();
    $order = makeCouponTestOrder($user->id);

    $service = app(CouponService::class);
    $service->redeem($coupon, $user->id, $order->id, 150);

    expect($coupon->fresh()->usage_count)->toBe(1);
    $this->assertDatabaseHas('coupon_usages', [
        'coupon_id' => $coupon->id,
        'order_id' => $order->id,
        'user_id' => $user->id,
        'discount_amount' => 150,
    ]);
});

it('redeem when usage_limit reached throws CouponException', function () {
    $coupon = makeCoupon(['usage_limit' => 3, 'usage_count' => 3]);
    $order = makeCouponTestOrder(null);

    $service = app(CouponService::class);

    expect(fn () => $service->redeem($coupon, null, $order->id, 100))
        ->toThrow(CouponException::class);
});

it('discount is computed from the stored coupon — client cannot inject amount', function () {
    $product = makeCouponTestProduct(['regular_price' => 1000]);
    [$cart, $token] = makeGuestCartWithProduct($product, 1); // subtotal 1000

    $coupon = makeCoupon(['type' => 'percent', 'amount' => 1000]); // 10%

    // Attempt to send an extra "discount" field — the server ignores it.
    $response = $this->withSession(['cart_token' => $token])
        ->post(route('cart.coupon.apply'), [
            'code' => $coupon->code,
            'discount' => 999999, // attacker tries to override discount
        ]);

    $response->assertRedirect();

    $summary = app(CartService::class)->summarize($cart->fresh());

    // Must be 10% of 1000 = 100, not 999999.
    expect($summary['totals']['discount_total'])->toBe(100);
    expect($summary['totals']['total'])->toBe(900);
});
