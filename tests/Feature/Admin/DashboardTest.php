<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a bare authenticated admin user (no special permissions needed for
 * the dashboard — it is accessible to any auth+verified user in the admin group).
 */
function dashboardUser(): User
{
    // Attach at least one role so the RBAC service doesn't barf.
    $user = User::factory()->create(['email_verified_at' => now()]);
    $role = Role::factory()->create(['level' => 2]);
    $perm = Permission::factory()->code('catalogue.view')->create();
    $role->permissions()->attach($perm);
    $user->roles()->attach($role);

    return $user;
}

/**
 * Insert a media row and return its id.
 */
function dashMediaId(): int
{
    return (int) DB::table('media')->insertGetId([
        'ulid' => Str::ulid()->toString(),
        'disk' => 'local',
        'path' => 'test/dash.jpg',
        'file_name' => 'dash.jpg',
        'extension' => 'jpg',
        'mime_type' => 'image/jpeg',
        'size' => 512,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

/**
 * Insert a paid order with one item and return the Order.
 */
function dashPaidOrder(int $total, int $productId, int $quantity, ?User $customer = null): Order
{
    $order = Order::create([
        'user_id' => $customer?->id,
        'status' => 'completed',
        'payment_status' => 'paid',
        'currency' => 'MYR',
        'subtotal' => $total,
        'total' => $total,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'amount_refunded' => 0,
    ]);

    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => $productId,
        'name' => 'Test Product',
        'sku' => 'TST-001',
        'quantity' => $quantity,
        'unit_price' => (int) ($total / max($quantity, 1)),
        'subtotal' => $total,
        'total' => $total,
        'discount' => 0,
        'tax' => 0,
    ]);

    return $order;
}

/**
 * Create a managed-stock simple product below its low_stock threshold.
 */
function dashLowStockProduct(): Product
{
    $product = Product::create([
        'name' => 'LowStock '.uniqid(),
        'slug' => 'low-stock-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'manage_stock' => true,
        'stock_quantity' => 1,
        'backorders' => 'no',
    ]);

    // Set low_stock_amount = 5 so 1 stock triggers low-stock.
    DB::table('products')
        ->where('id', $product->id)
        ->update(['low_stock_amount' => 5]);

    return $product->fresh();
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

test('unauthenticated request to dashboard is redirected', function () {
    $this->get(route('admin.dashboard'))->assertRedirect(route('login'));
});

test('authenticated verified user can access the dashboard', function () {
    $user = dashboardUser();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/Dashboard'));
});

// ---------------------------------------------------------------------------
// Analytics props structure
// ---------------------------------------------------------------------------

test('dashboard returns all required analytics keys', function () {
    $user = dashboardUser();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard')
            ->has('analytics.revenue_series')
            ->has('analytics.total_revenue_30d')
            ->has('analytics.total_orders_30d')
            ->has('analytics.orders_by_status')
            ->has('analytics.top_by_units')
            ->has('analytics.top_by_revenue')
            ->has('analytics.recent_orders')
            ->has('analytics.low_stock_count')
            ->has('analytics.new_customers_count')
        );
});

test('revenue_series contains exactly 30 entries', function () {
    $user = dashboardUser();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->count('analytics.revenue_series', 30)
        );
});

// ---------------------------------------------------------------------------
// Revenue aggregation
// ---------------------------------------------------------------------------

test('total_revenue_30d sums paid order totals from the last 30 days', function () {
    $user = dashboardUser();

    $product = Product::create([
        'name' => 'Revenue Prod',
        'slug' => 'rev-prod-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'manage_stock' => false,
        'backorders' => 'no',
    ]);

    // Three paid orders totalling 5000 cents.
    dashPaidOrder(1000, $product->id, 1);
    dashPaidOrder(2000, $product->id, 2);
    dashPaidOrder(2000, $product->id, 2);

    // One unpaid order — should not count.
    Order::create([
        'status' => 'pending',
        'payment_status' => 'pending',
        'currency' => 'MYR',
        'subtotal' => 9999,
        'total' => 9999,
        'discount_total' => 0,
        'shipping_total' => 0,
        'tax_total' => 0,
        'amount_refunded' => 0,
    ]);

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.total_revenue_30d', fn ($v) => (int) $v >= 5000)
        );
});

// ---------------------------------------------------------------------------
// Low stock count
// ---------------------------------------------------------------------------

test('low_stock_count reflects the number of managed products at or below threshold', function () {
    $user = dashboardUser();

    // Two low-stock products.
    dashLowStockProduct();
    dashLowStockProduct();

    // One product with plenty of stock — should not count.
    $ok = Product::create([
        'name' => 'FullStock '.uniqid(),
        'slug' => 'full-stock-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'manage_stock' => true,
        'stock_quantity' => 100,
        'backorders' => 'no',
    ]);
    DB::table('products')->where('id', $ok->id)->update(['low_stock_amount' => 5]);

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.low_stock_count', fn ($v) => (int) $v >= 2)
        );
});

// ---------------------------------------------------------------------------
// Top products
// ---------------------------------------------------------------------------

test('top_by_units lists products ordered by units sold descending', function () {
    $user = dashboardUser();

    $high = Product::create(['name' => 'High Seller', 'slug' => 'hs-'.uniqid(), 'type' => 'simple', 'status' => 'active', 'manage_stock' => false, 'backorders' => 'no']);
    $low = Product::create(['name' => 'Low Seller',  'slug' => 'ls-'.uniqid(), 'type' => 'simple', 'status' => 'active', 'manage_stock' => false, 'backorders' => 'no']);

    dashPaidOrder(500, $high->id, 10); // 10 units
    dashPaidOrder(200, $low->id, 1);   // 1 unit

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.top_by_units.0.name', 'High Seller')
        );
});

// ---------------------------------------------------------------------------
// Recent orders
// ---------------------------------------------------------------------------

test('recent_orders returns at most 5 orders with expected shape', function () {
    $user = dashboardUser();

    $product = Product::create(['name' => 'Ro Prod', 'slug' => 'ro-prod-'.uniqid(), 'type' => 'simple', 'status' => 'active', 'manage_stock' => false, 'backorders' => 'no']);

    foreach (range(1, 7) as $i) {
        dashPaidOrder(100 * $i, $product->id, 1);
    }

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->count('analytics.recent_orders', 5)
            ->has('analytics.recent_orders.0.ulid')
            ->has('analytics.recent_orders.0.order_number')
            ->has('analytics.recent_orders.0.status')
            ->has('analytics.recent_orders.0.payment_status')
            ->has('analytics.recent_orders.0.total')
            ->has('analytics.recent_orders.0.currency')
            ->has('analytics.recent_orders.0.customer_name')
            ->has('analytics.recent_orders.0.created_at')
        );
});

// ---------------------------------------------------------------------------
// New customers count
// ---------------------------------------------------------------------------

test('new_customers_count includes users created in the last 30 days', function () {
    $user = dashboardUser();

    // Create 3 extra users in the last 30 days (dashboardUser is 1 of them already).
    User::factory()->count(3)->create(['email_verified_at' => now()]);

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.new_customers_count', fn ($v) => (int) $v >= 4)
        );
});
