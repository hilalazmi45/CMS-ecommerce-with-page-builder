<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Orders\Models\Order;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Any authenticated + verified admin user may view the dashboard.
     * The route group already enforces auth + verified middleware.
     */
    public function index(): Response
    {
        $now = now();
        $thirtyDaysAgo = $now->copy()->subDays(30)->startOfDay();

        // ── Revenue per day (last 30 days, paid orders only) ────────────────
        /** @var Collection<string, int> $revenueByDay */
        $revenueByDay = Order::query()
            ->selectRaw("strftime('%Y-%m-%d', created_at) as day_date, SUM(total) as day_revenue")
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->groupBy('day_date')
            ->orderBy('day_date')
            ->get()
            ->mapWithKeys(function (Order $row) {
                /** @var string $date */
                $date = $row->getRawOriginal('day_date') ?? '';

                /** @var int|null $revenue */
                $revenue = $row->getRawOriginal('day_revenue');

                return [$date => (int) $revenue];
            });

        // Fill missing days with 0.
        $revenueSeries = [];
        for ($i = 29; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->format('Y-m-d');
            $revenueSeries[] = [
                'date' => $day,
                'revenue' => $revenueByDay[$day] ?? 0,
            ];
        }

        // ── Order counts by status ───────────────────────────────────────────
        /** @var array<string, int> $ordersByStatus */
        $ordersByStatus = DB::table('orders')
            ->whereNull('deleted_at')
            ->select('status', DB::raw('COUNT(*) as cnt'))
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->map(fn (mixed $v) => (int) $v)
            ->all();

        // ── Top products by units sold (last 30 days) ────────────────────────
        $topByUnits = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->whereNull('orders.deleted_at')
            ->whereNull('products.deleted_at')
            ->where('orders.payment_status', 'paid')
            ->where('orders.created_at', '>=', $thirtyDaysAgo)
            ->whereNotNull('order_items.product_id')
            ->select(
                'order_items.product_id',
                'products.name',
                'products.sku',
                DB::raw('SUM(order_items.quantity) as units_sold'),
            )
            ->groupBy('order_items.product_id', 'products.name', 'products.sku')
            ->orderByDesc('units_sold')
            ->limit(5)
            ->get()
            ->map(fn (object $row) => [
                'product_id' => (int) $row->product_id,
                'name' => (string) $row->name,
                'sku' => isset($row->sku) ? (string) $row->sku : null,
                'units_sold' => (int) $row->units_sold,
            ]);

        // ── Top products by revenue (last 30 days) ───────────────────────────
        $topByRevenue = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->whereNull('orders.deleted_at')
            ->whereNull('products.deleted_at')
            ->where('orders.payment_status', 'paid')
            ->where('orders.created_at', '>=', $thirtyDaysAgo)
            ->whereNotNull('order_items.product_id')
            ->select(
                'order_items.product_id',
                'products.name',
                'products.sku',
                DB::raw('SUM(order_items.total) as total_revenue'),
            )
            ->groupBy('order_items.product_id', 'products.name', 'products.sku')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(fn (object $row) => [
                'product_id' => (int) $row->product_id,
                'name' => (string) $row->name,
                'sku' => isset($row->sku) ? (string) $row->sku : null,
                'revenue' => (int) $row->total_revenue,
            ]);

        // ── Recent orders ────────────────────────────────────────────────────
        $recentOrders = DB::table('orders')
            ->leftJoin('users', 'users.id', '=', 'orders.user_id')
            ->whereNull('orders.deleted_at')
            ->select(
                'orders.ulid',
                'orders.order_number',
                'orders.status',
                'orders.payment_status',
                'orders.total',
                'orders.currency',
                'orders.created_at',
                'users.name as customer_name',
            )
            ->latest('orders.created_at')
            ->limit(5)
            ->get()
            ->map(fn (object $row) => [
                'ulid' => (string) $row->ulid,
                'order_number' => (string) $row->order_number,
                'status' => (string) $row->status,
                'payment_status' => (string) $row->payment_status,
                'total' => (int) $row->total,
                'currency' => (string) $row->currency,
                'customer_name' => isset($row->customer_name) ? (string) $row->customer_name : 'Guest',
                'created_at' => (string) $row->created_at,
            ]);

        // ── Low stock count (managed products where stock <= threshold) ───────
        $lowStockCount = (int) DB::table('products')
            ->where('manage_stock', true)
            ->whereNotNull('stock_quantity')
            ->whereRaw('stock_quantity <= COALESCE(low_stock_amount, 0)')
            ->whereNull('deleted_at')
            ->count();

        // ── New customers (last 30 days) ─────────────────────────────────────
        $newCustomersCount = User::query()
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->count();

        // ── Total revenue last 30 days ───────────────────────────────────────
        $totalRevenue30d = (int) DB::table('orders')
            ->whereNull('deleted_at')
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->sum('total');

        // ── Total orders last 30 days ────────────────────────────────────────
        $totalOrders30d = (int) DB::table('orders')
            ->whereNull('deleted_at')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->count();

        return Inertia::render('Admin/Dashboard', [
            'analytics' => [
                'revenue_series' => $revenueSeries,
                'total_revenue_30d' => $totalRevenue30d,
                'total_orders_30d' => $totalOrders30d,
                'orders_by_status' => $ordersByStatus,
                'top_by_units' => $topByUnits,
                'top_by_revenue' => $topByRevenue,
                'recent_orders' => $recentOrders,
                'low_stock_count' => $lowStockCount,
                'new_customers_count' => $newCustomersCount,
            ],
        ]);
    }
}
