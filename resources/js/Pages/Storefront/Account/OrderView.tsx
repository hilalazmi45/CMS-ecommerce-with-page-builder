/**
 * Account Order View — /my-account/orders/{ulid}
 *
 * Full order detail: header, items, totals, addresses, status timeline.
 * Money in integer minor units via formatMoney. SSR-safe.
 */

import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MapPin, CheckCircle, Clock } from 'lucide-react';
import AccountLayout from './AccountLayout';
import { formatMoney } from '@/utils/money';
import type {
    AccountOrderDetail,
    AccountOrderItem,
    AccountOrderAddress,
    AccountStatusTimelineEntry,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderViewProps {
    order: AccountOrderDetail;
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
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${cls}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}

function AddressCard({ address }: { address: AccountOrderAddress }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {address.type} Address
            </p>
            <p className="font-semibold">
                {address.first_name} {address.last_name}
            </p>
            {address.company && <p>{address.company}</p>}
            <p>{address.address_1}</p>
            {address.address_2 && <p>{address.address_2}</p>}
            <p>
                {[address.city, address.state, address.postcode].filter(Boolean).join(', ')}
            </p>
            <p>{address.country}</p>
            {address.phone && <p className="mt-1 text-gray-500">{address.phone}</p>}
        </div>
    );
}

function TimelineEntry({ entry }: { entry: AccountStatusTimelineEntry }) {
    return (
        <div className="flex gap-3">
            <div className="mt-0.5 shrink-0">
                <CheckCircle size={16} className="text-[#e60012]" aria-hidden="true" />
            </div>
            <div>
                <p className="text-sm font-semibold capitalize text-gray-900">
                    {entry.to_status.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleString()}
                </p>
                {entry.note && (
                    <p className="mt-0.5 text-sm text-gray-600">{entry.note}</p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrderView({ order }: OrderViewProps) {
    const paymentMethodLabel: Record<string, string> = {
        cod: 'Cash on Delivery',
        stripe: 'Card (Stripe)',
        paypal: 'PayPal',
        billplz: 'Billplz (FPX)',
        toyyibpay: 'toyyibPay (FPX)',
    };

    return (
        <AccountLayout activeRoute={route('account.orders')} title={`Order ${order.order_number}`}>
            <Head title={`Order ${order.order_number}`} />

            {/* Back link */}
            <Link
                href={route('account.orders')}
                className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
            >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to Orders
            </Link>

            {/* Order header */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">{order.order_number}</h3>
                        <p className="mt-0.5 text-sm text-gray-400">
                            Placed on {new Date(order.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                    </div>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium text-gray-400">Payment Method</dt>
                        <dd className="text-gray-900">
                            {paymentMethodLabel[order.payment_method] ?? order.payment_method}
                        </dd>
                    </div>
                    {order.shipping_method && (
                        <div>
                            <dt className="text-xs font-medium text-gray-400">Shipping Method</dt>
                            <dd className="text-gray-900">{order.shipping_method}</dd>
                        </div>
                    )}
                    {order.coupon_code && (
                        <div>
                            <dt className="text-xs font-medium text-gray-400">Coupon</dt>
                            <dd className="font-mono text-gray-900">{order.coupon_code}</dd>
                        </div>
                    )}
                    {order.customer_note && (
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-medium text-gray-400">Your Note</dt>
                            <dd className="text-gray-700">{order.customer_note}</dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Items */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <h3 className="border-b border-gray-100 px-6 py-4 font-semibold text-gray-900">Items</h3>
                <table className="min-w-full divide-y divide-gray-100">
                    <thead>
                        <tr>
                            {(['Product', 'Qty', 'Unit Price', 'Total'] as const).map((h) => (
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
                        {order.items.map((item: AccountOrderItem, idx: number) => (
                            <tr key={idx}>
                                <td className="px-4 py-3">
                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                    {item.sku && (
                                        <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                                    )}
                                    {item.meta && Object.keys(item.meta).length > 0 && (
                                        <ul className="mt-0.5 space-y-0.5">
                                            {Object.entries(item.meta).map(([k, v]) => (
                                                <li key={k} className="text-xs text-gray-500">
                                                    {k}: {v}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                    {formatMoney(item.unit_price, order.currency)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                                    {formatMoney(item.total, order.currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-gray-100 px-6 py-4">
                    <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Subtotal</dt>
                            <dd className="font-medium">{formatMoney(order.subtotal, order.currency)}</dd>
                        </div>
                        {order.discount_total > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Discount</dt>
                                <dd className="font-medium text-green-700">
                                    − {formatMoney(order.discount_total, order.currency)}
                                </dd>
                            </div>
                        )}
                        {order.shipping_total > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Shipping</dt>
                                <dd className="font-medium">{formatMoney(order.shipping_total, order.currency)}</dd>
                            </div>
                        )}
                        {order.tax_total > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Tax</dt>
                                <dd className="font-medium">{formatMoney(order.tax_total, order.currency)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-100 pt-2">
                            <dt className="font-bold text-gray-900">Total</dt>
                            <dd className="text-base font-bold text-[#e60012]">
                                {formatMoney(order.total, order.currency)}
                            </dd>
                        </div>
                        {order.amount_refunded > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Refunded</dt>
                                <dd className="font-medium text-blue-700">
                                    {formatMoney(order.amount_refunded, order.currency)}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* Addresses */}
            {order.addresses.length > 0 && (
                <div className="mb-6">
                    <h3 className="mb-3 font-semibold text-gray-900">
                        <MapPin size={16} className="mr-1.5 inline" aria-hidden="true" />
                        Addresses
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {order.addresses.map((addr, idx) => (
                            <AddressCard key={idx} address={addr} />
                        ))}
                    </div>
                </div>
            )}

            {/* Status timeline */}
            {order.timeline.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                    <h3 className="mb-4 font-semibold text-gray-900">
                        <Clock size={16} className="mr-1.5 inline" aria-hidden="true" />
                        Order Timeline
                    </h3>
                    <div className="space-y-4">
                        {order.timeline.map((entry, idx) => (
                            <TimelineEntry key={idx} entry={entry} />
                        ))}
                    </div>
                </div>
            )}
        </AccountLayout>
    );
}
