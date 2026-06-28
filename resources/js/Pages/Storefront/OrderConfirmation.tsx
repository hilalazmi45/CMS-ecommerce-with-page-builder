/**
 * Storefront Order Confirmation page — /order-confirmation/{ulid}
 *
 * Shown after a successful checkout. Receives the order details as an Inertia
 * prop and displays a thank-you message, item list, totals, addresses, and
 * order metadata.
 *
 * All money values are integer minor units and formatted via formatMoney.
 * No window/document access — SSR-safe.
 */

import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle,
    ArrowLeft,
    MapPin,
    ShoppingBag,
    Truck,
    CreditCard,
    MessageSquare,
} from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatMoney } from '@/utils/money';
import type { OrderConfirmation, OrderConfirmationAddress } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OrderConfirmationPageProps {
    order: OrderConfirmation;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelForStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForPaymentMethod(method: string): string {
    const map: Record<string, string> = {
        cod: 'Cash on Delivery',
        stripe: 'Card (Stripe)',
        paypal: 'PayPal',
        billplz: 'Billplz (FPX)',
        toyyibpay: 'toyyibPay (FPX)',
    };
    return map[method] ?? labelForStatus(method);
}

function StatusBadge({ status }: { status: string }) {
    const green = ['paid', 'completed', 'processing'];
    const red = ['failed', 'cancelled', 'refunded'];
    const colour = green.includes(status)
        ? 'bg-green-100 text-green-700'
        : red.includes(status)
          ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700';

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colour}`}
        >
            {labelForStatus(status)}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Address card
// ---------------------------------------------------------------------------

function AddressCard({
    address,
    title,
}: {
    address: OrderConfirmationAddress;
    title: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-gray-700">{title}</p>
            <address className="not-italic leading-relaxed text-gray-600">
                {address.first_name} {address.last_name}
                {address.company && (
                    <>
                        <br />
                        {address.company}
                    </>
                )}
                <br />
                {address.address_1}
                {address.address_2 && (
                    <>
                        <br />
                        {address.address_2}
                    </>
                )}
                <br />
                {[address.city, address.state, address.postcode]
                    .filter(Boolean)
                    .join(', ')}
                <br />
                {address.country}
                {address.phone && (
                    <>
                        <br />
                        {address.phone}
                    </>
                )}
                {address.email && (
                    <>
                        <br />
                        {address.email}
                    </>
                )}
            </address>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrderConfirmation({
    order,
}: OrderConfirmationPageProps) {
    const shippingAddress = order.addresses.find(
        (a) => a.type === 'shipping',
    );
    const billingAddress = order.addresses.find(
        (a) => a.type === 'billing',
    );

    return (
        <StorefrontLayout>
            <Head>
                <title>Order Confirmed</title>
            </Head>

            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
                {/* ---- Success header ---- */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle
                            size={32}
                            className="text-green-600"
                            aria-hidden="true"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Thank you for your order!
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Order{' '}
                        <span className="font-semibold text-gray-800">
                            #{order.order_number}
                        </span>{' '}
                        has been placed successfully.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <StatusBadge status={order.status} />
                        <StatusBadge status={order.payment_status} />
                    </div>
                </div>

                {/* ---- Items ---- */}
                <section
                    aria-labelledby="items-heading"
                    className="mb-6 rounded-2xl border border-gray-100 bg-white overflow-hidden"
                >
                    <h2
                        id="items-heading"
                        className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 text-base font-bold text-gray-900"
                    >
                        <ShoppingBag
                            size={16}
                            className="text-[#e60012]"
                            aria-hidden="true"
                        />
                        Items Ordered
                    </h2>

                    <ul aria-label="Order items" className="divide-y divide-gray-100">
                        {order.items.map((item, idx) => (
                            <li
                                key={idx}
                                className="flex items-start gap-4 px-6 py-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900">
                                        {item.name}
                                    </p>
                                    {item.sku && (
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            SKU: {item.sku}
                                        </p>
                                    )}
                                    {Object.entries(item.meta).length > 0 && (
                                        <dl className="mt-1 space-y-0.5">
                                            {Object.entries(item.meta).map(
                                                ([k, v]) => (
                                                    <div
                                                        key={k}
                                                        className="flex gap-1 text-xs text-gray-500"
                                                    >
                                                        <dt className="font-medium capitalize">
                                                            {k}:
                                                        </dt>
                                                        <dd>{v}</dd>
                                                    </div>
                                                ),
                                            )}
                                        </dl>
                                    )}
                                    <p className="mt-1 text-xs text-gray-400">
                                        {formatMoney(
                                            item.unit_price,
                                            order.currency,
                                        )}{' '}
                                        × {item.quantity}
                                    </p>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-gray-900">
                                    {formatMoney(item.total, order.currency)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ---- Totals ---- */}
                <section
                    aria-labelledby="totals-heading"
                    className="mb-6 rounded-2xl border border-gray-100 bg-white px-6 py-5"
                >
                    <h2
                        id="totals-heading"
                        className="mb-4 text-base font-bold text-gray-900"
                    >
                        Order Total
                    </h2>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Subtotal</dt>
                            <dd className="font-medium text-gray-900">
                                {formatMoney(order.subtotal, order.currency)}
                            </dd>
                        </div>
                        {order.discount_total > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-600">
                                    Discount
                                    {order.coupon_code && (
                                        <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                                            {order.coupon_code}
                                        </span>
                                    )}
                                </dt>
                                <dd className="font-medium text-green-700">
                                    −{' '}
                                    {formatMoney(
                                        order.discount_total,
                                        order.currency,
                                    )}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Shipping</dt>
                            <dd className="font-medium text-gray-900">
                                {order.shipping_total > 0
                                    ? formatMoney(
                                          order.shipping_total,
                                          order.currency,
                                      )
                                    : 'Free'}
                            </dd>
                        </div>
                        {order.tax_total > 0 && (
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Tax</dt>
                                <dd className="font-medium text-gray-900">
                                    {formatMoney(
                                        order.tax_total,
                                        order.currency,
                                    )}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-3 mt-1">
                            <dt className="font-bold text-gray-900 text-base">
                                Total
                            </dt>
                            <dd className="text-lg font-bold text-[#e60012]">
                                {formatMoney(order.total, order.currency)}
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* ---- Addresses ---- */}
                {(shippingAddress ?? billingAddress) && (
                    <section
                        aria-labelledby="addresses-heading"
                        className="mb-6 rounded-2xl border border-gray-100 bg-white px-6 py-5"
                    >
                        <h2
                            id="addresses-heading"
                            className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900"
                        >
                            <MapPin
                                size={16}
                                className="text-[#e60012]"
                                aria-hidden="true"
                            />
                            Addresses
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {shippingAddress && (
                                <AddressCard
                                    address={shippingAddress}
                                    title="Shipping Address"
                                />
                            )}
                            {billingAddress && (
                                <AddressCard
                                    address={billingAddress}
                                    title="Billing Address"
                                />
                            )}
                        </div>
                    </section>
                )}

                {/* ---- Order details ---- */}
                <section
                    aria-labelledby="details-heading"
                    className="mb-6 rounded-2xl border border-gray-100 bg-white px-6 py-5"
                >
                    <h2
                        id="details-heading"
                        className="mb-4 text-base font-bold text-gray-900"
                    >
                        Order Details
                    </h2>
                    <dl className="space-y-3 text-sm">
                        {order.shipping_method && (
                            <div className="flex items-start gap-2">
                                <Truck
                                    size={15}
                                    className="mt-0.5 shrink-0 text-gray-400"
                                    aria-hidden="true"
                                />
                                <div>
                                    <dt className="font-medium text-gray-700">
                                        Shipping method
                                    </dt>
                                    <dd className="text-gray-600">
                                        {order.shipping_method}
                                    </dd>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <CreditCard
                                size={15}
                                className="mt-0.5 shrink-0 text-gray-400"
                                aria-hidden="true"
                            />
                            <div>
                                <dt className="font-medium text-gray-700">
                                    Payment method
                                </dt>
                                <dd className="text-gray-600">
                                    {labelForPaymentMethod(order.payment_method)}
                                </dd>
                            </div>
                        </div>
                        {order.customer_note && (
                            <div className="flex items-start gap-2">
                                <MessageSquare
                                    size={15}
                                    className="mt-0.5 shrink-0 text-gray-400"
                                    aria-hidden="true"
                                />
                                <div>
                                    <dt className="font-medium text-gray-700">
                                        Order note
                                    </dt>
                                    <dd className="text-gray-600">
                                        {order.customer_note}
                                    </dd>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <CheckCircle
                                size={15}
                                className="mt-0.5 shrink-0 text-gray-400"
                                aria-hidden="true"
                            />
                            <div>
                                <dt className="font-medium text-gray-700">
                                    Date placed
                                </dt>
                                <dd className="text-gray-600">
                                    {new Date(order.created_at).toLocaleDateString(
                                        'en-MY',
                                        {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        },
                                    )}
                                </dd>
                            </div>
                        </div>
                    </dl>
                </section>

                {/* ---- CTA ---- */}
                <div className="text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#e60012] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c5000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </StorefrontLayout>
    );
}
