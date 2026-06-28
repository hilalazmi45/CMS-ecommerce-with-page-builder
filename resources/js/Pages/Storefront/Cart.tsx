/**
 * Storefront Cart page — /cart
 *
 * Receives the full CartSummary as a page prop (rendered by CartController::index()).
 * Mutations (update quantity, remove item, clear cart) use Inertia router calls
 * with preserveScroll so the user stays in place.
 *
 * Accessibility:
 *  - aria-live region for flash messages
 *  - Stepper buttons have aria-labels
 *  - Quantity <input> has a visually associated <label>
 *  - Controls disabled while a request is in flight (keyed per item id)
 *  - Focus rings visible on all interactive elements
 */

import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, X, Tag } from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import type { AppliedCoupon, CartItemSummary, CartSummary, Flash, PageProps } from '@/types';
import { formatMoney } from '@/utils/money';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CartPageProps {
    cart: CartSummary;
}

// ---------------------------------------------------------------------------
// Flash notification
// ---------------------------------------------------------------------------

interface FlashBannerProps {
    flash: Flash;
}

function FlashBanner({ flash }: FlashBannerProps) {
    const message = flash.success ?? flash.error ?? null;
    const isError = Boolean(flash.error);

    if (!message) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={[
                'rounded-lg px-4 py-3 text-sm font-medium',
                isError
                    ? 'bg-red-50 text-red-700'
                    : 'bg-green-50 text-green-700',
            ].join(' ')}
        >
            {message}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Quantity stepper
// ---------------------------------------------------------------------------

interface StepperProps {
    itemId: number;
    quantity: number;
    processing: boolean;
    onUpdate: (itemId: number, newQty: number) => void;
}

function QuantityStepper({ itemId, quantity, processing, onUpdate }: StepperProps) {
    const inputId = `qty-${itemId}`;

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const parsed = parseInt(e.target.value, 10);
        if (!isNaN(parsed) && parsed >= 1) {
            onUpdate(itemId, parsed);
        }
    }

    return (
        <div className="flex items-center" role="group" aria-label="Quantity">
            {/* Hidden label associates with the number input for screen readers */}
            <label htmlFor={inputId} className="sr-only">
                Quantity for this item
            </label>

            <button
                type="button"
                onClick={() => onUpdate(itemId, quantity - 1)}
                disabled={processing || quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-l-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e60012]"
            >
                <Minus size={14} aria-hidden="true" />
            </button>

            <input
                id={inputId}
                type="number"
                min={1}
                value={quantity}
                onChange={handleInputChange}
                disabled={processing}
                className="h-8 w-12 border-y border-gray-300 bg-white text-center text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#e60012] disabled:opacity-40"
            />

            <button
                type="button"
                onClick={() => onUpdate(itemId, quantity + 1)}
                disabled={processing}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-r-md border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e60012]"
            >
                <Plus size={14} aria-hidden="true" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Line item row
// ---------------------------------------------------------------------------

interface CartLineProps {
    item: CartItemSummary;
    currency: string;
    processingId: number | null;
    onUpdate: (itemId: number, qty: number) => void;
    onRemove: (itemId: number) => void;
}

function CartLine({ item, currency, processingId, onUpdate, onRemove }: CartLineProps) {
    const isProcessing = processingId === item.id;

    return (
        <tr className={`group transition-opacity ${isProcessing ? 'opacity-60' : 'opacity-100'}`}>
            {/* Image */}
            <td className="py-4 pr-4">
                <a
                    href={item.url}
                    className="block h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100"
                    tabIndex={-1}
                    aria-hidden="true"
                >
                    {item.image ? (
                        <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag
                                size={24}
                                className="text-gray-300"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </a>
            </td>

            {/* Product info */}
            <td className="py-4 pr-4">
                <a
                    href={item.url}
                    className="block text-sm font-semibold text-gray-900 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    {item.name}
                </a>
                {item.sku && (
                    <p className="mt-0.5 text-xs text-gray-400">
                        SKU: {item.sku}
                    </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                    {formatMoney(item.unit_price, currency)}{' '}
                    <span className="text-gray-400">each</span>
                </p>
            </td>

            {/* Quantity stepper */}
            <td className="py-4 pr-4">
                <QuantityStepper
                    itemId={item.id}
                    quantity={item.quantity}
                    processing={isProcessing}
                    onUpdate={onUpdate}
                />
            </td>

            {/* Line total */}
            <td className="py-4 pr-4 text-right">
                <span className="text-sm font-bold text-gray-900">
                    {formatMoney(item.line_total, currency)}
                </span>
            </td>

            {/* Remove */}
            <td className="py-4 text-right">
                <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    disabled={isProcessing}
                    aria-label={`Remove ${item.name} from cart`}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-[#e60012] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Order summary sidebar
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Coupon form
// ---------------------------------------------------------------------------

interface CouponFormProps {
    appliedCoupon: AppliedCoupon | null | undefined;
    currency: string;
}

function CouponForm({ appliedCoupon, currency }: CouponFormProps) {
    const [code, setCode] = useState('');
    const [applying, setApplying] = useState(false);
    const [removing, setRemoving] = useState(false);

    function handleApply(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (applying || !code.trim()) return;
        setApplying(true);
        router.post(
            route('cart.coupon.apply'),
            { code: code.trim() },
            {
                preserveScroll: true,
                preserveState: false,
                onFinish: () => {
                    setApplying(false);
                    setCode('');
                },
            },
        );
    }

    function handleRemove() {
        if (removing) return;
        setRemoving(true);
        router.delete(route('cart.coupon.remove'), {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => setRemoving(false),
        });
    }

    // If a valid coupon is applied, show the applied state.
    if (appliedCoupon?.valid) {
        return (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Tag size={14} className="shrink-0 text-green-600" aria-hidden="true" />
                        <span className="text-sm font-semibold text-green-800 truncate">
                            {appliedCoupon.code}
                        </span>
                        <span className="text-sm text-green-700 shrink-0">
                            − {formatMoney(appliedCoupon.discount, currency)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={removing}
                        aria-label="Remove coupon"
                        className="shrink-0 rounded-md p-1 text-green-600 hover:bg-green-100 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                    >
                        <X size={14} aria-hidden="true" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleApply} className="mt-4" noValidate>
            <label htmlFor="coupon-code" className="mb-1.5 block text-xs font-medium text-gray-600">
                Coupon code
            </label>
            <div className="flex gap-2">
                <input
                    id="coupon-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter code"
                    autoComplete="off"
                    disabled={applying}
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#e60012] focus:outline-none focus:ring-1 focus:ring-[#e60012] disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={applying || !code.trim()}
                    className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                >
                    {applying ? 'Applying…' : 'Apply'}
                </button>
            </div>
            {/* Show invalid coupon message inline */}
            {appliedCoupon && !appliedCoupon.valid && appliedCoupon.message && (
                <p role="alert" className="mt-1.5 text-xs text-red-600">
                    {appliedCoupon.message}
                </p>
            )}
        </form>
    );
}

// ---------------------------------------------------------------------------
// Order summary sidebar
// ---------------------------------------------------------------------------

interface SummaryProps {
    cart: CartSummary;
    onClear: () => void;
    clearing: boolean;
}

function OrderSummary({ cart, onClear, clearing }: SummaryProps) {
    const { currency, totals, applied_coupon } = cart;

    return (
        <aside className="lg:sticky lg:top-6 rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <h2 className="mb-4 text-base font-bold text-gray-900">Order Summary</h2>

            <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd className="font-medium text-gray-900">
                        {formatMoney(totals.subtotal, currency)}
                    </dd>
                </div>
                {totals.discount_total > 0 && (
                    <div className="flex justify-between">
                        <dt className="text-gray-600">
                            Discount
                            {applied_coupon?.valid && (
                                <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                                    {applied_coupon.code}
                                </span>
                            )}
                        </dt>
                        <dd className="font-medium text-green-700">
                            − {formatMoney(totals.discount_total, currency)}
                        </dd>
                    </div>
                )}
                <div className="flex justify-between">
                    <dt className="text-gray-600">Shipping</dt>
                    <dd className="font-medium text-gray-900">
                        {totals.shipping_total > 0
                            ? formatMoney(totals.shipping_total, currency)
                            : '—'}
                    </dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-gray-600">Tax</dt>
                    <dd className="font-medium text-gray-900">
                        {totals.tax_total > 0
                            ? formatMoney(totals.tax_total, currency)
                            : '—'}
                    </dd>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                    <dt className="font-bold text-gray-900">Total</dt>
                    <dd className="text-lg font-bold text-[#e60012]">
                        {formatMoney(totals.total, currency)}
                    </dd>
                </div>
            </dl>

            {/* Coupon code input / applied coupon display */}
            <CouponForm appliedCoupon={applied_coupon} currency={currency} />

            {/* Proceed to checkout — disabled until checkout is built */}
            <div className="mt-5">
                <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-400"
                    aria-disabled="true"
                    title="Checkout is coming soon"
                >
                    Proceed to Checkout
                </button>
                <p className="mt-1.5 text-center text-xs text-gray-400">
                    Checkout coming soon.
                </p>
            </div>

            {/* Clear cart */}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={onClear}
                    disabled={clearing}
                    className="w-full rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-[#e60012] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    <Trash2 size={14} className="mr-1.5 inline" aria-hidden="true" />
                    Clear Cart
                </button>
            </div>
        </aside>
    );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyCart() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <ShoppingBag size={36} className="text-gray-300" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-gray-500">
                Looks like you haven&apos;t added anything yet.
            </p>
            <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e60012] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c5000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
            >
                <ArrowLeft size={16} aria-hidden="true" />
                Continue Shopping
            </Link>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Cart({ cart }: CartPageProps) {
    // Access flash from shared props.
    const { flash } = usePage<PageProps>().props;

    // Track which item id is currently being mutated (null = idle).
    const [processingId, setProcessingId] = useState<number | null>(null);
    // Track whether the clear-all call is in flight.
    const [clearing, setClearing] = useState(false);

    // Use a ref so the callbacks below don't re-create on every render.
    const processingIdRef = useRef(processingId);
    useEffect(() => {
        processingIdRef.current = processingId;
    }, [processingId]);

    function handleUpdate(itemId: number, newQty: number) {
        if (processingIdRef.current !== null) return;
        setProcessingId(itemId);
        router.patch(
            route('cart.items.update', { item: itemId }),
            { quantity: newQty },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setProcessingId(null),
            },
        );
    }

    function handleRemove(itemId: number) {
        if (processingIdRef.current !== null) return;
        setProcessingId(itemId);
        router.delete(route('cart.items.destroy', { item: itemId }), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setProcessingId(null),
        });
    }

    function handleClear() {
        if (clearing) return;
        setClearing(true);
        router.delete(route('cart.clear'), {
            preserveScroll: true,
            preserveState: false,
            onFinish: () => setClearing(false),
        });
    }

    return (
        <StorefrontLayout>
            <Head>
                <title>Cart</title>
            </Head>

            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Page heading */}
                <div className="mb-8 flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Shopping Cart
                    </h1>
                    {cart.item_count > 0 && (
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#e60012] px-2 text-sm font-bold text-white">
                            {cart.item_count}
                        </span>
                    )}
                </div>

                {/* Flash messages */}
                <div className="mb-6">
                    <FlashBanner flash={flash} />
                </div>

                {cart.item_count === 0 ? (
                    <EmptyCart />
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
                        {/* Line items table */}
                        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                                            colSpan={2}
                                        >
                                            Product
                                        </th>
                                        <th
                                            scope="col"
                                            className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                                        >
                                            Quantity
                                        </th>
                                        <th
                                            scope="col"
                                            className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400"
                                        >
                                            Total
                                        </th>
                                        <th scope="col" className="py-3 pr-4">
                                            <span className="sr-only">Remove</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 px-4">
                                    {cart.items.map((item) => (
                                        <CartLine
                                            key={item.id}
                                            item={item}
                                            currency={cart.currency}
                                            processingId={processingId}
                                            onUpdate={handleUpdate}
                                            onRemove={handleRemove}
                                        />
                                    ))}
                                </tbody>
                            </table>

                            {/* Continue shopping link */}
                            <div className="border-t border-gray-100 px-4 py-4">
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                >
                                    <ArrowLeft size={14} aria-hidden="true" />
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* Sidebar summary */}
                        <OrderSummary
                            cart={cart}
                            onClear={handleClear}
                            clearing={clearing}
                        />
                    </div>
                )}
            </div>
        </StorefrontLayout>
    );
}
