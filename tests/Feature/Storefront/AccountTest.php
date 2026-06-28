<?php

declare(strict_types=1);

use App\Domain\Customers\Models\CustomerAddress;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a minimal Order for the given user with sane defaults.
 *
 * @param  array<string, mixed>  $overrides
 */
function makeOrder(User $user, array $overrides = []): Order
{
    return Order::create(array_merge([
        'user_id' => $user->id,
        'order_number' => 'ORD-'.strtoupper(substr(md5(uniqid()), 0, 8)),
        'status' => 'pending',
        'payment_status' => 'unpaid',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'total' => 1000,
        'amount_refunded' => 0,
    ], $overrides));
}

/**
 * Create a CustomerAddress for the given user.
 *
 * @param  array<string, mixed>  $overrides
 */
function makeAddress(User $user, array $overrides = []): CustomerAddress
{
    return CustomerAddress::create(array_merge([
        'user_id' => $user->id,
        'type' => 'shipping',
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'address_1' => '1 Test Street',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'is_default' => false,
    ], $overrides));
}

// ─── Unauthenticated access ───────────────────────────────────────────────────

it('redirects unauthenticated requests to login for every account route', function (string $routeName, array $params) {
    $this->get(route($routeName, $params))->assertRedirectToRoute('login');
})->with([
    ['account.dashboard', []],
    ['account.orders', []],
    ['account.addresses', []],
    ['account.details', []],
]);

it('redirects unauthenticated POST to store address to login', function () {
    $this->post(route('account.addresses.store'), [])->assertRedirect(route('login'));
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

it('dashboard shows only the authenticated user\'s recent orders', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $order1 = makeOrder($user1);
    $order2 = makeOrder($user2);

    $response = $this->actingAs($user1)
        ->get(route('account.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Dashboard')
            ->has('recentOrders', 1)
            ->where('recentOrders.0.ulid', $order1->ulid)
        );

    // Ensure user2's order is not present
    $orders = collect($response->getOriginalContent()->getData()['page']['props']['recentOrders']);
    expect($orders->pluck('ulid')->contains($order2->ulid))->toBeFalse();
});

it('dashboard payload never includes ip_address or admin_note', function () {
    $user = User::factory()->create();
    makeOrder($user, ['ip_address' => '1.2.3.4', 'admin_note' => 'Secret note']);

    $this->actingAs($user)
        ->get(route('account.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Dashboard')
            ->has('recentOrders', 1)
            ->missing('recentOrders.0.ip_address')
            ->missing('recentOrders.0.admin_note')
        );
});

// ─── Orders index ─────────────────────────────────────────────────────────────

it('orders index shows only the authenticated user\'s orders', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $o1 = makeOrder($user1);
    $o2 = makeOrder($user2);

    $this->actingAs($user1)
        ->get(route('account.orders'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Orders')
            ->has('orders.data', 1)
            ->where('orders.data.0.ulid', $o1->ulid)
        );
});

it('orders payload does not include internal fields', function () {
    $user = User::factory()->create();
    makeOrder($user, ['ip_address' => '1.2.3.4', 'admin_note' => 'internal']);

    $this->actingAs($user)
        ->get(route('account.orders'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Orders')
            ->has('orders.data', 1)
            ->missing('orders.data.0.ip_address')
            ->missing('orders.data.0.admin_note')
        );
});

// ─── Order show ───────────────────────────────────────────────────────────────

it('shows order detail to the owning user', function () {
    $user = User::factory()->create();
    $order = makeOrder($user);

    $this->actingAs($user)
        ->get(route('account.orders.show', ['order' => $order->ulid]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/OrderView')
            ->where('order.ulid', $order->ulid)
            ->where('order.order_number', $order->order_number)
        );
});

it('denies access to another user\'s order with 403', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $order = makeOrder($owner);

    $this->actingAs($other)
        ->get(route('account.orders.show', ['order' => $order->ulid]))
        ->assertForbidden();
});

it('order detail payload never includes ip_address or admin_note', function () {
    $user = User::factory()->create();
    $order = makeOrder($user, ['ip_address' => '10.0.0.1', 'admin_note' => 'admin only']);

    $this->actingAs($user)
        ->get(route('account.orders.show', ['order' => $order->ulid]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/OrderView')
            ->missing('order.ip_address')
            ->missing('order.admin_note')
        );
});

it('order detail timeline includes customer notes but omits admin note text', function () {
    $user = User::factory()->create();
    $order = makeOrder($user);

    // Customer-visible note (older)
    OrderStatusHistory::create([
        'order_id' => $order->id,
        'from_status' => 'pending',
        'to_status' => 'processing',
        'note' => 'Your order is being packed.',
        'is_customer_note' => true,
        'created_at' => now()->subMinutes(2),
    ]);

    // Admin-only note (newer)
    OrderStatusHistory::create([
        'order_id' => $order->id,
        'from_status' => 'processing',
        'to_status' => 'completed',
        'note' => 'Admin only note.',
        'is_customer_note' => false,
        'created_at' => now()->subMinute(),
    ]);

    $response = $this->actingAs($user)
        ->get(route('account.orders.show', ['order' => $order->ulid]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/OrderView')
            ->has('order.timeline', 2)
        );

    // Drill into the Inertia props to assert note filtering by to_status,
    // independent of sort order (both entries are within the same minute window).
    $props = $response->viewData('page')['props'];
    $timeline = collect($props['order']['timeline']);

    $processingEntry = $timeline->firstWhere('to_status', 'processing');
    expect($processingEntry)->not->toBeNull()
        ->and($processingEntry['note'])->toBe('Your order is being packed.');

    $completedEntry = $timeline->firstWhere('to_status', 'completed');
    expect($completedEntry)->not->toBeNull()
        ->and($completedEntry['note'])->toBeNull();
});

// ─── Addresses index ──────────────────────────────────────────────────────────

it('addresses index lists only the authenticated user\'s addresses', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $a1 = makeAddress($user1);
    $a2 = makeAddress($user2);

    $this->actingAs($user1)
        ->get(route('account.addresses'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Addresses')
            ->has('addresses', 1)
            ->where('addresses.0.ulid', $a1->ulid)
        );
});

// ─── Address store ────────────────────────────────────────────────────────────

it('authenticated user can store a new address scoped to themselves', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('account.addresses.store'), [
            'type' => 'billing',
            'first_name' => 'John',
            'last_name' => 'Smith',
            'address_1' => '99 Commerce St',
            'city' => 'Petaling Jaya',
            'country' => 'MY',
            'is_default' => true,
        ])
        ->assertRedirectToRoute('account.addresses');

    $address = CustomerAddress::where('user_id', $user->id)->first();
    expect($address)->not->toBeNull()
        ->and($address->first_name)->toBe('John')
        ->and($address->user_id)->toBe($user->id);
});

it('unauthenticated POST to store address redirects to login', function () {
    $this->post(route('account.addresses.store'), [
        'type' => 'billing',
        'first_name' => 'Ghost',
        'last_name' => 'User',
        'address_1' => '1 Ghost Ln',
        'city' => 'Nowhere',
        'country' => 'MY',
    ])->assertRedirectToRoute('login');
});

// ─── Address update ───────────────────────────────────────────────────────────

it('owner can update their own address', function () {
    $user = User::factory()->create();
    $address = makeAddress($user);

    $this->actingAs($user)
        ->put(route('account.addresses.update', ['address' => $address->ulid]), [
            'type' => 'shipping',
            'first_name' => 'Updated',
            'last_name' => 'Name',
            'address_1' => '42 New Road',
            'city' => 'Shah Alam',
            'country' => 'MY',
            'is_default' => false,
        ])
        ->assertRedirectToRoute('account.addresses');

    $address->refresh();
    expect($address->first_name)->toBe('Updated')
        ->and($address->city)->toBe('Shah Alam');
});

it('non-owner cannot update another user\'s address', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $address = makeAddress($owner);

    $this->actingAs($other)
        ->put(route('account.addresses.update', ['address' => $address->ulid]), [
            'type' => 'shipping',
            'first_name' => 'Hacked',
            'last_name' => 'Name',
            'address_1' => '1 Hacker Ln',
            'city' => 'Gotham',
            'country' => 'MY',
            'is_default' => false,
        ])
        ->assertForbidden();
});

// ─── Address destroy ──────────────────────────────────────────────────────────

it('owner can delete their own address', function () {
    $user = User::factory()->create();
    $address = makeAddress($user);

    $this->actingAs($user)
        ->delete(route('account.addresses.destroy', ['address' => $address->ulid]))
        ->assertRedirectToRoute('account.addresses');

    expect(CustomerAddress::find($address->id))->toBeNull();
});

it('non-owner cannot delete another user\'s address', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $address = makeAddress($owner);

    $this->actingAs($other)
        ->delete(route('account.addresses.destroy', ['address' => $address->ulid]))
        ->assertForbidden();

    expect(CustomerAddress::find($address->id))->not->toBeNull();
});

// ─── Default address uniqueness ───────────────────────────────────────────────

it('setting an address as default unsets the previous default of the same type', function () {
    $user = User::factory()->create();

    $first = makeAddress($user, ['type' => 'billing', 'is_default' => true]);
    $second = makeAddress($user, ['type' => 'billing', 'is_default' => false]);

    // Mark the second as default via the update endpoint
    $this->actingAs($user)
        ->put(route('account.addresses.update', ['address' => $second->ulid]), [
            'type' => 'billing',
            'first_name' => $second->first_name,
            'last_name' => $second->last_name,
            'address_1' => $second->address_1,
            'city' => $second->city,
            'country' => $second->country,
            'is_default' => true,
        ])
        ->assertRedirectToRoute('account.addresses');

    $first->refresh();
    $second->refresh();

    expect($second->is_default)->toBeTrue()
        ->and($first->is_default)->toBeFalse();
});

it('default flag is isolated per type: billing default does not affect shipping defaults', function () {
    $user = User::factory()->create();

    $billing = makeAddress($user, ['type' => 'billing', 'is_default' => true]);
    $shipping = makeAddress($user, ['type' => 'shipping', 'is_default' => true]);

    // Update billing: both should remain defaults (different types)
    $billing->refresh();
    $shipping->refresh();

    expect($billing->is_default)->toBeTrue()
        ->and($shipping->is_default)->toBeTrue();
});

// ─── Details ──────────────────────────────────────────────────────────────────

it('details page renders for authenticated user', function () {
    $user = User::factory()->create(['name' => 'Test User', 'email' => 'test@example.com']);

    $this->actingAs($user)
        ->get(route('account.details'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Account/Details')
            ->where('user.name', 'Test User')
            ->where('user.email', 'test@example.com')
        );
});
