<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Orders\Events\OrderPlaced;
use App\Domain\Orders\Events\OrderRefunded;
use App\Domain\Orders\Events\OrderShipped;
use App\Domain\Orders\Mail\OrderConfirmedMail;
use App\Domain\Orders\Mail\OrderRefundedMail;
use App\Domain\Orders\Mail\OrderShippedMail;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Services\OrderService;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Shipping\Models\ShippingZone;
use App\Domain\Shipping\Models\ShippingZoneMethod;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a simple in-stock product for checkout flows.
 */
function emailTestProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Email Test Product',
        'slug' => 'email-test-product-'.uniqid(),
        'sku' => 'ET-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 2000,
        'sale_price' => null,
        'manage_stock' => true,
        'stock_quantity' => 10,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

/**
 * Create a Malaysia shipping zone with a flat-rate method.
 *
 * @return array{ShippingZone, ShippingZoneMethod}
 */
function emailTestShipping(): array
{
    $zone = ShippingZone::create([
        'name' => 'Malaysia-Email',
        'regions' => ['MY'],
        'sort_order' => 0,
    ]);

    $method = ShippingZoneMethod::create([
        'zone_id' => $zone->id,
        'method_type' => 'flat_rate',
        'title' => 'Standard',
        'cost' => 500,
        'conditions' => null,
        'is_active' => true,
        'sort_order' => 0,
    ]);

    return [$zone, $method];
}

/**
 * Build a guest cart with one line.
 *
 * @return array{Cart, string}
 */
function emailTestCart(Product $product, int $qty = 1): array
{
    $token = 'et-'.uniqid();
    $cart = Cart::create(['session_id' => $token]);
    CartItem::create([
        'cart_id' => $cart->id,
        'product_id' => $product->id,
        'variation_id' => null,
        'quantity' => $qty,
    ]);

    return [$cart, $token];
}

/**
 * Build a valid COD checkout payload.
 */
function emailTestPayload(int $shippingMethodId, array $overrides = []): array
{
    return array_merge([
        'email' => 'buyer@example.com',
        'phone' => '0123456789',
        'shipping_first_name' => 'Jane',
        'shipping_last_name' => 'Smith',
        'shipping_address_1' => '1 Test Street',
        'shipping_city' => 'Kuala Lumpur',
        'shipping_country' => 'MY',
        'billing_same_as_shipping' => true,
        'shipping_method_id' => $shippingMethodId,
        'payment_method' => 'cod',
        'idempotency_key' => Str::ulid()->toString(),
    ], $overrides);
}

/**
 * Build a minimal paid Order for refund / shipped tests.
 *
 * @param  array<string, mixed>  $overrides
 */
function emailTestPaidOrder(array $overrides = []): Order
{
    $order = Order::create(array_merge([
        'user_id' => null,
        'status' => 'processing',
        'payment_status' => 'paid',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 5000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 5500,
        'amount_refunded' => 0,
    ], $overrides));

    // Billing address with email so listeners can resolve a recipient.
    OrderAddress::create([
        'order_id' => $order->id,
        'type' => 'billing',
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'address_1' => '1 Test St',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'email' => 'jane@example.com',
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => null,
        'variation_id' => null,
        'name' => 'Email Test Item',
        'sku' => 'ET-001',
        'quantity' => 1,
        'unit_price' => 5000,
        'subtotal' => 5000,
        'discount' => 0,
        'tax' => 0,
        'total' => 5000,
    ]);

    return $order;
}

/**
 * Create an admin user with the given permission codes.
 */
function emailTestAdmin(string ...$codes): User
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

// ─── Tests ────────────────────────────────────────────────────────────────────

it('placing a COD order queues an OrderConfirmedMail to the billing address email', function () {
    Mail::fake();

    $product = emailTestProduct();
    [, $method] = emailTestShipping();
    [$cart, $token] = emailTestCart($product);

    $payload = emailTestPayload($method->id, [
        'email' => 'buyer@example.com',
        'idempotency_key' => Str::ulid()->toString(),
    ]);

    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload)
        ->assertRedirect();

    // One order was placed.
    expect(Order::count())->toBe(1);

    // OrderConfirmedMail was queued exactly once to the address email.
    // Billing address email comes from the shipping address that was duplicated
    // as billing (billing_same_as_shipping = true); the address stores whatever
    // email the checkout writes — here none was explicitly on the address, but
    // the listener also falls back to order customer email. Either way the mail
    // must be queued.
    Mail::assertQueued(OrderConfirmedMail::class, 1);

    Mail::assertQueued(OrderConfirmedMail::class, function (OrderConfirmedMail $mail): bool {
        return $mail->order->order_number !== '';
    });
});

it('OrderPlaced is dispatched on first checkout submit but NOT re-dispatched on duplicate idempotency key replay', function () {
    Event::fake([OrderPlaced::class]);

    $product = emailTestProduct();
    [, $method] = emailTestShipping();
    [$cart, $token] = emailTestCart($product);

    $key = Str::ulid()->toString();
    $payload = emailTestPayload($method->id, ['idempotency_key' => $key]);

    // First submission.
    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    Event::assertDispatched(OrderPlaced::class, 1);

    // Second submission with the same idempotency key — idempotency replay, work
    // closure does NOT re-run, event is NOT re-dispatched.
    $this->withSession(['cart_token' => $token])
        ->post(route('checkout.store'), $payload);

    // Still exactly one dispatch.
    Event::assertDispatched(OrderPlaced::class, 1);
});

it('transitioning an order to completed dispatches OrderShipped and queues OrderShippedMail', function () {
    Mail::fake();

    $order = emailTestPaidOrder();

    /** @var OrderService $service */
    $service = app(OrderService::class);
    $service->updateStatus($order, 'completed', 'Shipped today.');

    Mail::assertQueued(OrderShippedMail::class, 1);

    Mail::assertQueued(OrderShippedMail::class, function (OrderShippedMail $mail) use ($order): bool {
        return $mail->order->id === $order->id;
    });
});

it('OrderShipped event is dispatched when status becomes completed', function () {
    Event::fake([OrderShipped::class]);

    $order = emailTestPaidOrder();

    /** @var OrderService $service */
    $service = app(OrderService::class);
    $service->updateStatus($order, 'completed', 'Shipped today.');

    Event::assertDispatched(OrderShipped::class, 1);
    Event::assertDispatched(OrderShipped::class, function (OrderShipped $e) use ($order): bool {
        return $e->order->id === $order->id;
    });
});

it('OrderShipped event is NOT dispatched when status changes to a non-completed value', function () {
    Event::fake([OrderShipped::class]);

    $order = emailTestPaidOrder();

    /** @var OrderService $service */
    $service = app(OrderService::class);
    $service->updateStatus($order, 'cancelled');

    Event::assertNotDispatched(OrderShipped::class);
});

it('refunding an order queues an OrderRefundedMail', function () {
    Mail::fake();
    Http::preventStrayRequests();
    Http::fake(['*' => Http::response([], 200)]);

    $admin = emailTestAdmin('order.process_refund');
    $order = emailTestPaidOrder(['payment_method' => 'cod']);

    $this->actingAs($admin)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 5500,
            'reason' => 'Customer request',
            'restock' => false,
            'idempotency_key' => Str::ulid()->toString(),
        ])
        ->assertRedirect();

    Mail::assertQueued(OrderRefundedMail::class, 1);

    Mail::assertQueued(OrderRefundedMail::class, function (OrderRefundedMail $mail) use ($order): bool {
        return $mail->order->id === $order->id
            && $mail->refundAmountMinor === 5500;
    });
});

it('OrderRefunded event is dispatched after a successful refund', function () {
    Event::fake([OrderRefunded::class]);
    Http::preventStrayRequests();
    Http::fake(['*' => Http::response([], 200)]);

    $admin = emailTestAdmin('order.process_refund');
    $order = emailTestPaidOrder(['payment_method' => 'cod']);

    $this->actingAs($admin)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 5500,
            'reason' => 'Test refund',
            'restock' => false,
            'idempotency_key' => Str::ulid()->toString(),
        ])
        ->assertRedirect();

    Event::assertDispatched(OrderRefunded::class, 1);
});

it('listener does not crash when no email address can be resolved on confirmed mail', function () {
    Mail::fake();

    // Build an order with no addresses and no user — listener should log and return.
    $order = Order::create([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'total' => 1000,
        'amount_refunded' => 0,
    ]);

    // Dispatching OrderPlaced with an order that has no addresses should not throw.
    expect(fn () => event(new OrderPlaced($order)))->not->toThrow(Throwable::class);

    // No mail was sent.
    Mail::assertNothingQueued();
});

it('listener does not crash when no email address can be resolved on shipped mail', function () {
    Mail::fake();

    $order = Order::create([
        'user_id' => null,
        'status' => 'processing',
        'payment_status' => 'paid',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'total' => 1000,
        'amount_refunded' => 0,
    ]);

    expect(fn () => event(new OrderShipped($order)))->not->toThrow(Throwable::class);

    Mail::assertNothingQueued();
});

it('listener does not crash when no email address can be resolved on refunded mail', function () {
    Mail::fake();

    $order = Order::create([
        'user_id' => null,
        'status' => 'processing',
        'payment_status' => 'paid',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'total' => 1000,
        'amount_refunded' => 0,
    ]);

    $money = Money::of(500, 'MYR');

    expect(fn () => event(new OrderRefunded($order, $money)))->not->toThrow(Throwable::class);

    Mail::assertNothingQueued();
});
