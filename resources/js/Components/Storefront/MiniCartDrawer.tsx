/**
 * MiniCartDrawer — off-canvas sliding cart panel.
 *
 * Mounted once in StorefrontLayout. Opens via the 'mini-cart:open' CustomEvent
 * dispatched by openMiniCart(). Reads cart data from Inertia shared props.
 *
 * Accessibility:
 *  - role="dialog" aria-modal="true" aria-label="Shopping cart"
 *  - Focus moves into the panel on open; returns to the last focused element on close.
 *  - Escape key closes the drawer.
 *  - Backdrop click closes the drawer.
 *  - Respects prefers-reduced-motion (skips CSS transition).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { X, ShoppingBag } from 'lucide-react';
import type { PageProps, CartSummary, CartItemSummary } from '@/types';
import { onMiniCartOpen } from '@/utils/miniCart';
import { formatMoney } from '@/utils/money';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface LineItemProps {
    item: CartItemSummary;
    currency: string;
}

function LineItem({ item, currency }: LineItemProps) {
    return (
        <li className="flex gap-3 py-3">
            {/* Product image */}
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={20} className="text-gray-300" aria-hidden="true" />
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
                <a
                    href={item.url}
                    className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    {item.name}
                </a>
                {item.sku && (
                    <p className="mt-0.5 text-xs text-gray-400">SKU: {item.sku}</p>
                )}
                <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        {item.quantity} × {formatMoney(item.unit_price, currency)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                        {formatMoney(item.line_total, currency)}
                    </span>
                </div>
            </div>
        </li>
    );
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------

/**
 * Detect if the user prefers reduced motion. SSR-safe.
 */
function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function MiniCartDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const lastFocusedRef = useRef<Element | null>(null);

    // Read shared cart from Inertia props — may be undefined on admin pages.
    const { cart } = usePage<PageProps>().props as PageProps & { cart?: CartSummary };

    // Subscribe to the open event.
    useEffect(() => {
        const unsubscribe = onMiniCartOpen(() => {
            lastFocusedRef.current = document.activeElement;
            setIsOpen(true);
        });
        return unsubscribe;
    }, []);

    // Move focus into the drawer when it opens.
    useEffect(() => {
        if (isOpen) {
            // Small rAF delay lets the CSS transition start before we steal focus.
            const id = requestAnimationFrame(() => {
                closeButtonRef.current?.focus();
            });
            return () => cancelAnimationFrame(id);
        }
    }, [isOpen]);

    const close = useCallback(() => {
        setIsOpen(false);
        if (
            lastFocusedRef.current instanceof HTMLElement ||
            lastFocusedRef.current instanceof SVGElement
        ) {
            lastFocusedRef.current.focus();
        }
        lastFocusedRef.current = null;
    }, []);

    // Restore focus and handle Escape.
    useEffect(() => {
        if (!isOpen) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                close();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close]);

    const itemCount = cart?.item_count ?? 0;
    const currency = cart?.currency ?? 'MYR';
    const items = cart?.items ?? [];
    const subtotal = cart?.totals.subtotal ?? 0;

    const reducedMotion = prefersReducedMotion();

    // Transition classes — skip transform animation for reduced-motion.
    const drawerClasses = [
        'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl',
        reducedMotion
            ? ''
            : 'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
    ]
        .filter(Boolean)
        .join(' ');

    const backdropClasses = [
        'fixed inset-0 z-40 bg-black/40',
        reducedMotion
            ? ''
            : 'transition-opacity duration-300 ease-in-out',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            {/* Backdrop */}
            <div
                className={backdropClasses}
                aria-hidden="true"
                onClick={close}
            />

            {/* Drawer panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Shopping cart"
                className={drawerClasses}
                // When fully offscreen, remove it from the accessibility tree.
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <ShoppingBag size={20} className="text-gray-700" aria-hidden="true" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Shopping Cart
                            {itemCount > 0 && (
                                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e60012] px-1.5 text-xs font-bold text-white">
                                    {itemCount}
                                </span>
                            )}
                        </h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={close}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                        aria-label="Close cart"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <ShoppingBag
                                size={48}
                                className="mb-4 text-gray-200"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-500">
                                Your cart is empty
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Add some products to get started.
                            </p>
                        </div>
                    ) : (
                        <ul
                            role="list"
                            className="divide-y divide-gray-100"
                            aria-label="Cart items"
                        >
                            {items.map((item) => (
                                <LineItem
                                    key={item.id}
                                    item={item}
                                    currency={currency}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                    {/* Subtotal row */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Subtotal</span>
                        <span className="text-base font-bold text-gray-900">
                            {formatMoney(subtotal, currency)}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400">
                        Shipping and taxes calculated at checkout.
                    </p>

                    {/* CTA buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                            href={route('cart.index')}
                            onClick={close}
                            className="flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                        >
                            View Cart
                        </Link>
                        <button
                            type="button"
                            disabled
                            className="flex cursor-not-allowed items-center justify-center rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400"
                            title="Checkout coming soon"
                            aria-disabled="true"
                        >
                            Checkout
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400">
                        Checkout is coming soon.
                    </p>
                </div>
            </div>
        </>
    );
}
