/**
 * Account Dashboard — /my-account
 *
 * Greeting, counts, recent orders table, quick-links to sub-pages.
 * SSR-safe: no browser-only APIs.
 */

import { Head, Link, usePage } from '@inertiajs/react';
import { ShoppingBag, MapPin, User, ArrowRight } from 'lucide-react';
import AccountLayout from './AccountLayout';
import { formatMoney } from '@/utils/money';
import type { AccountOrderRow, PageProps } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardProps {
    recentOrders: AccountOrderRow[];
    totalOrders: number;
    totalAddresses: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
    const green = ['paid', 'completed', 'processing'];
    const red = ['failed', 'cancelled', 'refunded'];
    const cls = green.includes(status)
        ? 'bg-green-100 text-green-700'
        : red.includes(status)
          ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700';

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Dashboard({ recentOrders, totalOrders, totalAddresses }: DashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const userName = auth.user?.name ?? 'Customer';

    return (
        <AccountLayout activeRoute={route('account.dashboard')} title="Dashboard">
            <Head title="My Account" />

            {/* Greeting */}
            <p className="mb-6 text-gray-600">
                Welcome back, <span className="font-semibold text-gray-900">{userName}</span>.
            </p>

            {/* Quick stats */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <ShoppingBag size={16} aria-hidden="true" />
                        <span className="text-sm font-medium">Total Orders</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <MapPin size={16} aria-hidden="true" />
                        <span className="text-sm font-medium">Saved Addresses</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalAddresses}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                    <div className="mb-2 flex items-center gap-2 text-gray-500">
                        <User size={16} aria-hidden="true" />
                        <span className="text-sm font-medium">Account</span>
                    </div>
                    <p className="text-sm font-medium text-[#e60012]">
                        <Link href={route('account.details')} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]">
                            Edit Details
                        </Link>
                    </p>
                </div>
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl border border-gray-100 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                    <Link
                        href={route('account.orders')}
                        className="flex items-center gap-1 text-sm font-medium text-[#e60012] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                    >
                        View all
                        <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>

                {recentOrders.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-400">
                        You haven&apos;t placed any orders yet.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {recentOrders.map((order) => (
                            <div key={order.ulid} className="flex items-center justify-between gap-4 px-6 py-4">
                                <div className="min-w-0">
                                    <Link
                                        href={route('account.orders.show', { order: order.ulid })}
                                        className="block text-sm font-semibold text-gray-900 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                    >
                                        {order.order_number}
                                    </Link>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        {new Date(order.created_at).toLocaleDateString()}
                                        {' · '}
                                        {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <StatusBadge status={order.status} />
                                    <span className="text-sm font-bold text-gray-900">
                                        {formatMoney(order.total, order.currency)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AccountLayout>
    );
}
