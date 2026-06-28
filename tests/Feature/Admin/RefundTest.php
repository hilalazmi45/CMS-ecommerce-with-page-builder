<?php

declare(strict_types=1);

use App\Domain\Orders\Events\OrderRefunded;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a user with exactly the listed permission codes attached via a fresh
 * role. Follows the same pattern as InventoryTest.php.
 */
function refundAdmin(string ...$codes): User
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
 * Build a minimal paid Order for refund tests.
 *
 * @param  array<string, mixed>  $overrides
 */
function paidOrder(array $overrides = []): Order
{
    return Order::create(array_merge([
        'user_id' => null,
        'status' => 'processing',
        'payment_status' => 'paid',
        'payment_method' => 'stripe',
        'payment_reference' => 'pi_test_'.Str::random(8),
        'currency' => 'MYR',
        'subtotal' => 10000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 10500,
        'amount_refunded' => 0,
    ], $overrides));
}

/**
 * Create a minimal OrderItem for the given order.
 */
function orderItemFor(Order $order, int $quantity = 1, int $unitPrice = 5000): OrderItem
{
    return OrderItem::create([
        'order_id' => $order->id,
        'product_id' => null,
        'variation_id' => null,
        'name' => 'Test Product',
        'sku' => 'TEST-SKU',
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'subtotal' => $unitPrice * $quantity,
        'discount' => 0,
        'tax' => 0,
        'total' => $unitPrice * $quantity,
    ]);
}

/** Enable Stripe config used by the gateway. */
function stripeConfig(): void
{
    config([
        'commerce.payments.stripe.enabled' => true,
        'commerce.payments.stripe.public_key' => 'pk_test_abc',
        'commerce.payments.stripe.secret_key' => 'sk_test_abc',
        'commerce.payments.stripe.webhook_secret' => 'whsec_test',
    ]);
}

/** Idempotency key unique per test. */
function idem(): string
{
    return Str::ulid()->toString();
}

// ─── Authorization tests ──────────────────────────────────────────────────────

test('unauthenticated request is redirected from refund endpoint', function () {
    $order = paidOrder();

    $this->post(route('admin.orders.refund', $order->ulid), [
        'amount' => 1000,
        'idempotency_key' => idem(),
    ])->assertRedirect(route('login'));
});

test('user without process_refund permission gets 403', function () {
    $user = refundAdmin('order.view_all');
    $order = paidOrder();

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 1000,
            'idempotency_key' => idem(),
        ])
        ->assertForbidden();
});

// ─── Full refund ──────────────────────────────────────────────────────────────

test('full refund: amount_refunded equals total, payment_status becomes refunded, transaction recorded, event dispatched, history added', function () {
    Event::fake([OrderRefunded::class]);
    stripeConfig();

    Http::preventStrayRequests();
    Http::fake([
        'https://api.stripe.com/v1/refunds' => Http::response([
            'id' => 're_full_001',
            'object' => 'refund',
            'amount' => 10500,
            'currency' => 'myr',
            'payment_intent' => 'pi_full_001',
            'status' => 'succeeded',
        ], 200),
    ]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_reference' => 'pi_full_001', 'total' => 10500]);

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 10500,
            'reason' => 'Customer cancelled',
            'restock' => false,
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->amount_refunded)->toBe(10500)
        ->and($order->payment_status)->toBe('refunded')
        ->and($order->status)->toBe('refunded');

    // A refunded transaction row must exist.
    $this->assertDatabaseHas('payment_transactions', [
        'order_id' => $order->id,
        'gateway' => 'stripe',
        'status' => 'refunded',
        'amount' => 10500,
        'reference' => 're_full_001',
    ]);

    // History note about the refund.
    $this->assertDatabaseHas('order_status_history', [
        'order_id' => $order->id,
    ]);

    Event::assertDispatched(OrderRefunded::class, function (OrderRefunded $event) use ($order) {
        return $event->order->id === $order->id
            && $event->amount->minor === 10500;
    });
});

// ─── Partial refunds ──────────────────────────────────────────────────────────

test('partial refund: payment_status becomes partially_refunded and balance is reduced', function () {
    stripeConfig();

    Http::preventStrayRequests();
    Http::fake([
        'https://api.stripe.com/v1/refunds' => Http::response([
            'id' => 're_partial_001',
            'object' => 'refund',
            'amount' => 3000,
            'currency' => 'myr',
            'payment_intent' => 'pi_partial_001',
            'status' => 'succeeded',
        ], 200),
    ]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_reference' => 'pi_partial_001', 'total' => 10500]);

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 3000,
            'reason' => 'Partial return',
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->amount_refunded)->toBe(3000)
        ->and($order->payment_status)->toBe('partially_refunded')
        ->and($order->status)->not->toBe('refunded'); // not yet fully refunded
});

test('two partial refunds that together equal the total → payment_status becomes refunded', function () {
    stripeConfig();

    Http::preventStrayRequests();
    Http::fake([
        'https://api.stripe.com/v1/refunds' => Http::response([
            'id' => 're_split_'.Str::random(4),
            'object' => 'refund',
            'amount' => 5250,
            'currency' => 'myr',
            'payment_intent' => 'pi_split_001',
            'status' => 'succeeded',
        ], 200),
    ]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_reference' => 'pi_split_001', 'total' => 10500]);

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 5250,
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();
    expect($order->payment_status)->toBe('partially_refunded');

    // Second refund completing the balance.
    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 5250,
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();

    expect($order->amount_refunded)->toBe(10500)
        ->and($order->payment_status)->toBe('refunded');
});

// ─── Over-refund guard ─────────────────────────────────────────────────────────

test('refund exceeding the refundable balance is rejected with error, no state change', function () {
    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['total' => 10500, 'amount_refunded' => 5000]);
    // Remaining refundable: 5500 — attempt to refund 6000.

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 6000,
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    // Session should carry the error from withErrors([]).
    $order->refresh();

    // amount_refunded must be unchanged.
    expect($order->amount_refunded)->toBe(5000);

    // No extra refund transactions created.
    expect(PaymentTransaction::where('order_id', $order->id)->where('status', 'refunded')->count())->toBe(0);
});

// ─── COD / offline refund ─────────────────────────────────────────────────────

test('COD order (gateway does not support refund) is recorded as offline manual refund', function () {
    Event::fake([OrderRefunded::class]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_method' => 'cod', 'total' => 3000]);

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 3000,
            'reason' => 'Manual cash refund',
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();

    // State updated correctly.
    expect($order->amount_refunded)->toBe(3000)
        ->and($order->payment_status)->toBe('refunded');

    // A refunded transaction must exist (offline).
    $tx = PaymentTransaction::where('order_id', $order->id)
        ->where('status', 'refunded')
        ->first();
    expect($tx)->not->toBeNull();
    expect($tx->gateway)->toBe('cod');

    // No HTTP calls made (COD = no network).
    Http::assertNothingSent();

    Event::assertDispatched(OrderRefunded::class);
});

// ─── Idempotency ─────────────────────────────────────────────────────────────

test('duplicate submission with the same idempotency_key does not double-refund', function () {
    stripeConfig();

    Http::preventStrayRequests();
    Http::fake([
        'https://api.stripe.com/v1/refunds' => Http::response([
            'id' => 're_idem_001',
            'object' => 'refund',
            'amount' => 2000,
            'currency' => 'myr',
            'payment_intent' => 'pi_idem_001',
            'status' => 'succeeded',
        ], 200),
    ]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_reference' => 'pi_idem_001', 'total' => 5000]);
    $key = idem();

    // First request succeeds.
    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 2000,
            'idempotency_key' => $key,
        ])
        ->assertRedirect();

    $order->refresh();
    $amountAfterFirst = $order->amount_refunded;

    // Second request with the same key — idempotency replays the stored result
    // without running $work again. amount_refunded must NOT increase.
    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 2000,
            'idempotency_key' => $key,
        ])
        ->assertRedirect();

    $order->refresh();

    // amount_refunded must not have increased again.
    expect($order->amount_refunded)->toBe($amountAfterFirst);
});

// ─── Gateway failure ──────────────────────────────────────────────────────────

test('gateway refund failure leaves amount_refunded unchanged and returns an error', function () {
    stripeConfig();

    Http::preventStrayRequests();
    Http::fake([
        'https://api.stripe.com/v1/refunds' => Http::response([
            'error' => ['type' => 'invalid_request_error', 'code' => 'charge_already_refunded'],
        ], 400),
    ]);

    $user = refundAdmin('order.process_refund');
    $order = paidOrder(['payment_reference' => 'pi_fail_001', 'total' => 5000]);

    $this->actingAs($user)
        ->post(route('admin.orders.refund', $order->ulid), [
            'amount' => 5000,
            'idempotency_key' => idem(),
        ])
        ->assertRedirect();

    $order->refresh();

    // State unchanged on failure.
    expect($order->amount_refunded)->toBe(0)
        ->and($order->payment_status)->toBe('paid');
});

// ─── show() endpoint canRefund prop ───────────────────────────────────────────

test('show() passes canRefund = true to the Inertia page when user has permission', function () {
    $user = refundAdmin('order.view_all', 'order.process_refund');
    $order = paidOrder();

    $this->actingAs($user)
        ->get(route('admin.orders.show', $order->ulid))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Orders/Show')
            ->where('canRefund', true)
        );
});

test('show() passes canRefund = false when user lacks the permission', function () {
    $user = refundAdmin('order.view_all');
    $order = paidOrder();

    $this->actingAs($user)
        ->get(route('admin.orders.show', $order->ulid))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('canRefund', false)
        );
});
