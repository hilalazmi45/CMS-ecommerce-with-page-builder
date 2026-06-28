/**
 * Account Orders — /my-account/orders
 *
 * Paginated list of the authenticated customer's orders.
 * SSR-safe: no browser-only APIs.
 */

import { Head, Link } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';
import AccountLayout from './AccountLayout';
import { formatMoney } from '@/utils/money';
import type { AccountOrderRow, Paginated } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrdersProps {
    orders: Paginated<AccountOrderRow>;
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

export default function Orders({ orders }: OrdersProps) {
    return (
        <AccountLayout activeRoute={route('account.orders')} title="Orders">
            <Head title="My Orders" />

            {orders.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center">
                    <ShoppingBag size={40} className="mb-4 text-gray-200" aria-hidden="true" />
                    <p className="font-medium text-gray-500">No orders yet.</p>
                    <Link
                        href="/"
                        className="mt-4 text-sm font-medium text-[#e60012] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                    >
                        Start shopping
                    </Link>
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr>
                                    {(['Order', 'Date', 'Status', 'Items', 'Total', ''] as const).map((h) => (
                                        <th
                                            key={h}
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 last:text-right"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.data.map((order) => (
                                    <tr key={order.ulid} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                            {order.order_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {order.item_count}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                            {formatMoney(order.total, order.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={route('account.orders.show', { order: order.ulid })}
                                                className="text-sm font-medium text-[#e60012] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {orders.last_page > 1 && (
                        <nav aria-label="Order pagination" className="mt-6 flex items-center justify-center gap-1">
                            {orders.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        aria-current={link.active ? 'page' : undefined}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={[
                                            'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors',
                                            link.active
                                                ? 'bg-[#e60012] text-white'
                                                : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                                        ].join(' ')}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-gray-300"
                                    />
                                )
                            ))}
                        </nav>
                    )}
                </>
            )}
        </AccountLayout>
    );
}
