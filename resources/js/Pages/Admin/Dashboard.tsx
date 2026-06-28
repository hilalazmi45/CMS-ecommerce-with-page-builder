import AdminLayout from '@/Layouts/AdminLayout';
import { usePermissions } from '@/hooks/usePermissions';
import type { PageProps } from '@/types';
import { formatMoney } from '@/utils/money';
import { Link, usePage } from '@inertiajs/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueDayEntry {
    date: string;
    revenue: number;
}

interface TopProduct {
    product_id: number;
    name: string;
    sku: string | null;
    units_sold?: number;
    revenue?: number;
}

interface RecentOrder {
    ulid: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    currency: string;
    customer_name: string;
    created_at: string;
}

interface Analytics {
    revenue_series: RevenueDayEntry[];
    total_revenue_30d: number;
    total_orders_30d: number;
    orders_by_status: Record<string, number>;
    top_by_units: TopProduct[];
    top_by_revenue: TopProduct[];
    recent_orders: RecentOrder[];
    low_stock_count: number;
    new_customers_count: number;
}

interface DashboardProps extends PageProps {
    analytics: Analytics;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOURS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
    refunded: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
};

function statusBadge(status: string) {
    const cls = STATUS_COLOURS[status] ?? 'bg-gray-100 text-gray-600';
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
            {status}
        </span>
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

// ---------------------------------------------------------------------------
// Revenue SVG chart (pure, no library)
// ---------------------------------------------------------------------------

function RevenueChart({ series }: { series: RevenueDayEntry[] }) {
    const W = 600;
    const H = 140;
    const PAD_L = 56;
    const PAD_B = 28;
    const PAD_T = 12;
    const PAD_R = 16;

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const maxRevenue = Math.max(...series.map((d) => d.revenue), 1);
    const minRevenue = 0;

    const n = series.length;

    function x(i: number) {
        return PAD_L + (i / Math.max(n - 1, 1)) * chartW;
    }

    function y(value: number) {
        const ratio = (value - minRevenue) / (maxRevenue - minRevenue || 1);
        return PAD_T + chartH - ratio * chartH;
    }

    // Build polyline points.
    const points = series.map((d, i) => `${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ');

    // Area fill path.
    const areaPath =
        `M ${x(0).toFixed(1)},${y(series[0]?.revenue ?? 0).toFixed(1)} ` +
        series.slice(1).map((d, i) => `L ${x(i + 1).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(' ') +
        ` L ${x(n - 1).toFixed(1)},${(PAD_T + chartH).toFixed(1)} L ${x(0).toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`;

    // Y-axis ticks: 4 steps.
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
        value: minRevenue + r * (maxRevenue - minRevenue),
        yPos: PAD_T + chartH - r * chartH,
    }));

    // X-axis labels: every 7 days.
    const xLabels = series
        .map((d, i) => ({ i, label: d.date.slice(5) }))
        .filter((_, i) => i === 0 || i === n - 1 || i % 7 === 0);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            aria-label="Revenue last 30 days"
            role="img"
            className="w-full"
        >
            {/* Grid lines */}
            {yTicks.map((t, idx) => (
                <line
                    key={idx}
                    x1={PAD_L}
                    y1={t.yPos.toFixed(1)}
                    x2={W - PAD_R}
                    y2={t.yPos.toFixed(1)}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                />
            ))}

            {/* Y-axis labels */}
            {yTicks.map((t, idx) => (
                <text
                    key={idx}
                    x={PAD_L - 6}
                    y={t.yPos + 4}
                    textAnchor="end"
                    fontSize={9}
                    fill="#9ca3af"
                >
                    {t.value >= 100
                        ? `${(t.value / 100).toFixed(0)}`
                        : t.value.toFixed(0)}
                </text>
            ))}

            {/* Area fill */}
            {n > 1 && <path d={areaPath} fill="#dbeafe" fillOpacity={0.5} />}

            {/* Line */}
            {n > 1 && (
                <polyline
                    points={points}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            )}

            {/* X-axis labels */}
            {xLabels.map(({ i, label }) => (
                <text
                    key={i}
                    x={x(i).toFixed(1)}
                    y={H - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#9ca3af"
                >
                    {label}
                </text>
            ))}
        </svg>
    );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
    label,
    value,
    sub,
    accent = false,
}: {
    label: string;
    value: string;
    sub?: string;
    accent?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-5 ${
                accent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
        >
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-blue-700' : 'text-gray-900'}`}>
                {value}
            </p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
    const { auth, analytics } = usePage<DashboardProps>().props;
    const { isSuperAdmin } = usePermissions();

    const currency = 'MYR';

    return (
        <AdminLayout title="Dashboard">
            <div className="max-w-5xl space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Welcome back, {auth.user?.name}
                    </h2>
                    <p className="text-gray-500">
                        {isSuperAdmin ? 'Super Administrator' : 'Administrator'} · Last 30 days
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Revenue (30d)"
                        value={formatMoney(analytics.total_revenue_30d, currency)}
                        accent
                    />
                    <StatCard
                        label="Orders (30d)"
                        value={String(analytics.total_orders_30d)}
                    />
                    <StatCard
                        label="Low Stock SKUs"
                        value={String(analytics.low_stock_count)}
                        sub="Managed products at or below threshold"
                    />
                    <StatCard
                        label="New Customers (30d)"
                        value={String(analytics.new_customers_count)}
                    />
                </div>

                {/* Revenue chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">
                        Revenue — last 30 days (cents)
                    </h3>
                    <RevenueChart series={analytics.revenue_series} />
                </div>

                {/* Orders by status + top products */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Orders by status */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-700">
                            Orders by status (all time)
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(analytics.orders_by_status).length === 0 && (
                                <p className="text-xs text-gray-400">No orders yet.</p>
                            )}
                            {Object.entries(analytics.orders_by_status).map(([status, count]) => (
                                <div
                                    key={status}
                                    className="flex items-center justify-between text-sm"
                                >
                                    {statusBadge(status)}
                                    <span className="font-medium text-gray-700">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top products by units */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-700">
                            Top products by units sold (30d)
                        </h3>
                        {analytics.top_by_units.length === 0 ? (
                            <p className="text-xs text-gray-400">No sales yet.</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-1 text-left font-medium text-gray-500">Product</th>
                                        <th className="pb-1 text-right font-medium text-gray-500">Units</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.top_by_units.map((p) => (
                                        <tr key={p.product_id} className="border-b border-gray-50">
                                            <td className="py-1.5 text-gray-700 truncate max-w-[180px]">
                                                {p.name}
                                                {p.sku && (
                                                    <span className="ml-1 text-gray-400">#{p.sku}</span>
                                                )}
                                            </td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">
                                                {p.units_sold}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top products by revenue */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">
                        Top products by revenue (30d)
                    </h3>
                    {analytics.top_by_revenue.length === 0 ? (
                        <p className="text-xs text-gray-400">No revenue yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">Product</th>
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">SKU</th>
                                    <th className="pb-1 text-right text-xs font-medium text-gray-500">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.top_by_revenue.map((p) => (
                                    <tr key={p.product_id} className="border-b border-gray-50">
                                        <td className="py-1.5 text-gray-700">{p.name}</td>
                                        <td className="py-1.5 text-gray-400 text-xs">{p.sku ?? '—'}</td>
                                        <td className="py-1.5 text-right font-medium text-gray-900">
                                            {formatMoney(p.revenue ?? 0, currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent orders */}
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Recent orders</h3>
                        <Link
                            href={route('admin.orders.index')}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            View all →
                        </Link>
                    </div>
                    {analytics.recent_orders.length === 0 ? (
                        <p className="text-xs text-gray-400">No orders yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">Order</th>
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">Customer</th>
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">Status</th>
                                    <th className="pb-1 text-left text-xs font-medium text-gray-500">Payment</th>
                                    <th className="pb-1 text-right text-xs font-medium text-gray-500">Total</th>
                                    <th className="pb-1 text-right text-xs font-medium text-gray-500">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.recent_orders.map((order) => (
                                    <tr key={order.ulid} className="border-b border-gray-50">
                                        <td className="py-1.5">
                                            <Link
                                                href={route('admin.orders.show', order.ulid)}
                                                className="font-mono text-xs text-blue-600 hover:underline"
                                            >
                                                {order.order_number}
                                            </Link>
                                        </td>
                                        <td className="py-1.5 text-gray-700">{order.customer_name}</td>
                                        <td className="py-1.5">{statusBadge(order.status)}</td>
                                        <td className="py-1.5">{statusBadge(order.payment_status)}</td>
                                        <td className="py-1.5 text-right font-medium text-gray-900">
                                            {formatMoney(order.total, order.currency)}
                                        </td>
                                        <td className="py-1.5 text-right text-xs text-gray-400">
                                            {formatDate(order.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
