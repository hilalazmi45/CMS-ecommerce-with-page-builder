<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Inventory\Models\InventoryMovement;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Models\CouponUsage;
use App\Domain\Shipping\Models\ShippingZone;
use App\Domain\Shipping\Models\ShippingZoneMethod;
use App\Models\User;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a simple, in-stock product (managed stock, no backorders).
 */
function checkoutProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Checkout Product',
        'slug' => 'checkout-product-'.uniqid(),
        'sku' => 'CHK-'.uniqid(),
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
 * Create a shipping zone matching Malaysia with a flat-rate method.
 *
 * @return array{ShippingZone, ShippingZoneMethod}
 */
function checkoutShipping(array $zoneOverrides = [], array $methodOverrides = []): array
{
    $zone = ShippingZone::create(array_merge([
        'name' => 'Malaysia',
        'regions' => ['MY'],
        'sort_order' => 0,
    ], $zoneOverrides));

    $method = ShippingZoneMethod::create(array_merge([
        'zone_id' => $zone->id,
        'method_type' => 'flat_rate',
        'title' => 'Standard Delivery',
        'cost' => 500, // MYR 5.00
        'conditions' => null,
        'is_active' => true,
        'sort_order' => 0,
    ], $methodOverrides));

    return [$zone, $method];
}

/**
 * Create a guest cart with one product line.
 *
 * @return array{Cart, string}
 */
function checkoutCart(Product $product, int $quantity = 1, ?string $couponCode = null): array
{
    $token = 'checkout-guest-'.uniqid();
    $cart = Cart::create(['session_id' => $token, 'coupon_code' => $couponCode]);
    CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'quantity' => $quantity,
    ]);

    return [$cart, $token];
}

/**
 * Build a valid checkout payload for a given shipping method ID.
 */
function checkoutPayload(int $shippingMethodId, array $overrides = []): array
{
    return array_merge([
        'email' => 'buyer@example.com',
        'phone' => '0123456789',
        'shipping_first_name' => 'John',
        'shipping_last_name' => 'Doe',
        'shipping_address_1' => '123 Main St',
        'shipping_city' => 'Kuala Lumpur',
        'shipping_country' => 'MY',
        'billing_same_as_shipping' => true,
        'shipping_method_id' => $shippingMethodId,
        'payment_method' => 'cod',
        'idempotency_key' => Str::ulid()->toString(),
    ], $overrides);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

it('guest can place an order with correct totals and structure', function () {
    $product = checkoutProduct(['regular_price' => 2000, 'stock_quantity' => 5]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 2);

    $payload = checkoutPayload($method->id, [
        'idempotency_key' => Str::ulid()->toString(),
    ]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    // Exactly one order created
    expect(Order::count())->toBe(1);

    $order = Order::first();

    // Payment / status defaults
    expect($order->status)->toBe('pending');
    expect($order->payment_status)->toBe('pending');
    expect($order->payment_method)->toBe('cod');
    expect($order->currency)->toBe('MYR');

    // Server-recomputed totals: 2 × 2000 = 4000 subtotal + 500 shipping, no tax
    expect($order->subtotal)->toBe(4000);
    expect($order->shipping_total)->toBe(500);
    expect($order->discount_total)->toBe(0);
    expect($order->total)->toBe(4500);

    // Items snapshot
    expect(OrderItem::count())->toBe(1);
    $item = OrderItem::first();
    expect($item->unit_price)->toBe(2000);
    expect($item->quantity)->toBe(2);
    expect($item->subtotal)->toBe(4000);

    // Two address rows created (billing same as shipping → two rows both type)
    expect(OrderAddress::where('order_id', $order->id)->count())->toBe(2);
    expect(OrderAddress::where('order_id', $order->id)->where('type', 'shipping')->exists())->toBeTrue();
    expect(OrderAddress::where('order_id', $order->id)->where('type', 'billing')->exists())->toBeTrue();

    // Status history
    expect(OrderStatusHistory::where('order_id', $order->id)->count())->toBe(1);
    $history = OrderStatusHistory::where('order_id', $order->id)->first();
    expect($history->from_status)->toBeNull();
    expect($history->to_status)->toBe('pending');

    // Cart cleared
    $cart->refresh();
    expect($cart->items()->count())->toBe(0);
});

it('server ignores any tampered total/subtotal/price fields submitted by the client', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 5]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 1);

    // Attacker tries to force a zero total
    $payload = checkoutPayload($method->id, [
        'total' => 0,
        'subtotal' => 0,
        'price' => 0,
        'unit_price' => 0,
        'discount_total' => 99999,
        'idempotency_key' => Str::ulid()->toString(),
    ]);

    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $order = Order::first();
    expect($order)->not->toBeNull();

    // Server-authoritative total: 1000 subtotal + 500 shipping
    expect($order->subtotal)->toBe(1000);
    expect($order->total)->toBe(1500);
    expect($order->discount_total)->toBe(0);
});

it('duplicate submission with same idempotency key returns the same order only once', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 10]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 1);

    $idempotencyKey = Str::ulid()->toString();
    $payload = checkoutPayload($method->id, ['idempotency_key' => $idempotencyKey]);

    // First submission places the order
    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    expect(Order::count())->toBe(1);
    $orderUlid = Order::first()->ulid;

    // Second submission with the same idempotency key — should replay the same order
    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    // Still only one order
    expect(Order::count())->toBe(1);
    expect(Order::first()->ulid)->toBe($orderUlid);
});

it('fails when requested quantity exceeds stock', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 1, 'reserved_quantity' => 0]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 2); // requesting 2 when only 1 in stock

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    // No order created
    expect(Order::count())->toBe(0);

    // Stock unchanged
    $product->refresh();
    expect($product->stock_quantity)->toBe(1);
    expect($product->reserved_quantity)->toBe(0);
});

it('fails when second order exhausts remaining stock after first order commits it', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 1, 'reserved_quantity' => 0]);
    [, $method] = checkoutShipping();

    // First cart/order — consumes the only unit
    [$cart1, $token1] = checkoutCart($product, 1);
    $payload1 = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $this->withSession(['cart_token' => $token1])
        ->post(route('checkout.store'), $payload1);

    expect(Order::count())->toBe(1);

    // Product stock should now be 0
    $product->refresh();
    expect($product->stock_quantity)->toBe(0);

    // Second cart attempts to buy the same product
    [$cart2, $token2] = checkoutCart($product, 1);
    $payload2 = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response2 = $this->withSession(['cart_token' => $token2])
        ->post(route('checkout.store'), $payload2);

    $response2->assertRedirect();
    $response2->assertSessionHas('error');

    // Still only one order
    expect(Order::count())->toBe(1);
});

it('inventory is committed after a successful order: on_hand decreases and movement row exists', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 10, 'reserved_quantity' => 0]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 3);

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $product->refresh();
    expect($product->stock_quantity)->toBe(7); // 10 - 3 committed
    expect($product->reserved_quantity)->toBe(0); // reserve + commit = net 0 reserved

    $order = Order::first();
    $commitMovement = InventoryMovement::query()
        ->where('product_id', $product->id)
        ->where('type', 'commit')
        ->where('reference_type', Order::class)
        ->where('reference_id', $order->id)
        ->first();

    expect($commitMovement)->not->toBeNull();
    expect($commitMovement->quantity)->toBe(-3);
    expect($commitMovement->stock_after)->toBe(7);
});

it('applies coupon discount and records coupon usage on the order', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 10]);
    [, $method] = checkoutShipping();

    $coupon = Coupon::create([
        'ulid' => Str::ulid()->toString(),
        'code' => 'SAVE10-'.uniqid(),
        'type' => 'percent',
        'amount' => 1000, // 10% (stored as basis points × 100 or percent × 100 — check calculateDiscount)
        'usage_limit' => null,
        'usage_count' => 0,
        'per_customer_limit' => null,
        'individual_use' => false,
        'exclude_sale_items' => false,
        'is_active' => true,
        'expires_at' => null,
    ]);

    [$cart, $token] = checkoutCart($product, 2, $coupon->code); // subtotal = 2000, discount = 200

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    expect(Order::count())->toBe(1);
    $order = Order::first();

    // 10% of 2000 = 200
    expect($order->discount_total)->toBe(200);
    expect($order->coupon_code)->toBe($coupon->code);
    // total = 2000 - 200 + 500 = 2300
    expect($order->total)->toBe(2300);

    // Coupon usage_count incremented
    $coupon->refresh();
    expect($coupon->usage_count)->toBe(1);

    // CouponUsage row exists
    expect(CouponUsage::where('coupon_id', $coupon->id)->where('order_id', $order->id)->exists())->toBeTrue();
    expect(CouponUsage::where('coupon_id', $coupon->id)->first()->discount_amount)->toBe(200);
});

it('rolls back the entire order when coupon usage limit is exhausted at the last instant', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 10]);
    [, $method] = checkoutShipping();

    // Coupon already at its global limit
    $coupon = Coupon::create([
        'ulid' => Str::ulid()->toString(),
        'code' => 'LIMIT-'.uniqid(),
        'type' => 'fixed_cart',
        'amount' => 100,
        'usage_limit' => 1,
        'usage_count' => 1, // already exhausted
        'per_customer_limit' => null,
        'individual_use' => false,
        'exclude_sale_items' => false,
        'is_active' => true,
        'expires_at' => null,
    ]);

    [$cart, $token] = checkoutCart($product, 1, $coupon->code);

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    // No order, no stock change
    expect(Order::count())->toBe(0);

    $product->refresh();
    expect($product->stock_quantity)->toBe(10);
    expect($product->reserved_quantity)->toBe(0);
});

it('rejects an invalid shipping method and creates no order', function () {
    $product = checkoutProduct(['stock_quantity' => 5]);
    // Create a zone for a different country; it should NOT match MY
    $otherZone = ShippingZone::create(['name' => 'Singapore', 'regions' => ['SG'], 'sort_order' => 0]);
    $sgMethod = ShippingZoneMethod::create([
        'zone_id' => $otherZone->id,
        'method_type' => 'flat_rate',
        'title' => 'SG Delivery',
        'cost' => 800,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    [$cart, $token] = checkoutCart($product, 1);

    // Use the SG method ID but ship to MY — should fail
    $payload = checkoutPayload($sgMethod->id, [
        'shipping_country' => 'MY',
        'idempotency_key' => Str::ulid()->toString(),
    ]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    expect(Order::count())->toBe(0);
});

it('redirects to cart when cart is empty', function () {
    $response = $this->withSession(['cart_token' => 'empty-'.uniqid()])
        ->get(route('checkout.index'));

    $response->assertRedirect(route('cart.index'));
});

it('redirects to cart on checkout submission with empty cart', function () {
    [, $method] = checkoutShipping();

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response = $this->withSession(['cart_token' => 'empty-'.uniqid()])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect(route('cart.index'));
    expect(Order::count())->toBe(0);
});

it('order placer (session) can view the confirmation page', function () {
    $product = checkoutProduct(['stock_quantity' => 5]);
    [, $method] = checkoutShipping();
    [$cart, $token] = checkoutCart($product, 1);

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    // Place order — session receives 'recent_orders' update
    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();

    // Follow redirect — the session should allow viewing confirmation
    $order = Order::first();
    expect($order)->not->toBeNull();

    $confirmResponse = $this->withSession(['cart_token' => $token, 'recent_orders' => [$order->ulid]])
        ->get(route('checkout.confirmation', ['order' => $order->ulid]));

    $confirmResponse->assertStatus(200);
});

it('a different session cannot view the confirmation page (403)', function () {
    // Create the order directly (no HTTP request) to avoid session carryover from
    // the placement request — we only want to test the authorization check.
    $product = checkoutProduct(['stock_quantity' => 5]);
    [, $method] = checkoutShipping();

    $order = Order::create([
        'user_id' => null, // guest order — no authenticated owner
        'status' => 'pending',
        'payment_status' => 'pending',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 1500,
        'payment_method' => 'cod',
        'shipping_method' => $method->title,
    ]);

    // A session that has never seen this order
    $response = $this->withSession(['cart_token' => 'stranger-'.uniqid()])
        ->get(route('checkout.confirmation', ['order' => $order->ulid]));

    $response->assertStatus(403);
});

it('transaction rolls back fully when coupon redeem throws — no order, items, or stock change', function () {
    $product = checkoutProduct(['regular_price' => 1000, 'stock_quantity' => 10]);
    [, $method] = checkoutShipping();

    // Coupon that will fail at redeem time (limit=1, usage_count=1)
    $coupon = Coupon::create([
        'ulid' => Str::ulid()->toString(),
        'code' => 'EXHAUST-'.uniqid(),
        'type' => 'fixed_cart',
        'amount' => 100,
        'usage_limit' => 1,
        'usage_count' => 1,
        'per_customer_limit' => null,
        'individual_use' => false,
        'exclude_sale_items' => false,
        'is_active' => true,
        'expires_at' => null,
    ]);

    [$cart, $token] = checkoutCart($product, 1, $coupon->code);

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response = $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    // No order, no order items, no addresses, no status history
    expect(Order::count())->toBe(0);
    expect(OrderItem::count())->toBe(0);
    expect(OrderAddress::count())->toBe(0);
    expect(OrderStatusHistory::count())->toBe(0);

    // Stock unchanged
    $product->refresh();
    expect($product->stock_quantity)->toBe(10);
    expect($product->reserved_quantity)->toBe(0);

    // No inventory movements for this failed attempt
    expect(InventoryMovement::where('product_id', $product->id)->count())->toBe(0);
});

it('authenticated user can place an order and view confirmation', function () {
    $user = User::factory()->create();
    $product = checkoutProduct(['stock_quantity' => 5]);
    [, $method] = checkoutShipping();

    $cart = Cart::create(['user_id' => $user->id]);
    CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->id,
        'quantity' => 1,
    ]);

    $payload = checkoutPayload($method->id, ['idempotency_key' => Str::ulid()->toString()]);

    $response = $this->actingAs($user)
        ->post(route('checkout.store'), $payload);

    $response->assertRedirect();

    $order = Order::first();
    expect($order)->not->toBeNull();
    expect($order->user_id)->toBe($user->id);

    // Authenticated user can view confirmation directly via user_id match
    $confirmResponse = $this->actingAs($user)
        ->get(route('checkout.confirmation', ['order' => $order->ulid]));

    $confirmResponse->assertStatus(200);
});

it('shipping methods endpoint returns available methods for valid address', function () {
    checkoutShipping(['regions' => ['MY']]);

    $response = $this->post(route('checkout.shipping-methods'), [
        'country' => 'MY',
        'state' => null,
    ]);

    $response->assertStatus(200);
    $data = $response->json();
    expect($data)->toBeArray();
    expect(count($data))->toBeGreaterThanOrEqual(1);
    expect($data[0])->toHaveKey('id');
    expect($data[0])->toHaveKey('cost');
    expect($data[0])->toHaveKey('is_free');
});

it('shipping methods endpoint returns empty array for country with no zone', function () {
    // No zone for JP
    $response = $this->post(route('checkout.shipping-methods'), [
        'country' => 'JP',
    ]);

    $response->assertStatus(200);
    expect($response->json())->toBeArray()->toBeEmpty();
});
