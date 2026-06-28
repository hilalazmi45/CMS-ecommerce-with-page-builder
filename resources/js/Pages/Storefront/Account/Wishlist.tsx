/**
 * Account Wishlist — /my-account/wishlist
 *
 * Grid of the authenticated customer's wishlisted products.
 * Each row has: image, name, price, in-stock badge, "Add to cart", "Remove".
 *
 * SSR-safe: no browser-only APIs.
 */

import { Head, Link, router, useForm } from '@inertiajs/react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import AccountLayout from './AccountLayout';
import { formatMoney } from '@/utils/money';
import type { WishlistItem } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WishlistProps {
    items: WishlistItem[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StockBadge({ inStock }: { inStock: boolean }) {
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                inStock
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700',
            ].join(' ')}
        >
            {inStock ? 'In stock' : 'Out of stock'}
        </span>
    );
}

interface WishlistCardProps {
    item: WishlistItem;
}

function WishlistCard({ item }: WishlistCardProps) {
    // "Add to cart" — posts to cart.add then removes from wishlist via toggle.
    const cartForm = useForm({
        product_id: item.product_id,
        quantity: 1,
        variation_id: item.variation_id ?? undefined,
    });

    // "Remove" — fires toggle (which deletes the row) or the explicit destroy.
    function handleRemove(e: React.FormEvent) {
        e.preventDefault();
        router.delete(route('account.wishlist.destroy', { wishlist: item.wishlist_id }), {
            preserveScroll: true,
        });
    }

    function handleAddToCart(e: React.FormEvent) {
        e.preventDefault();
        cartForm.post(route('cart.add'), { preserveScroll: true });
    }

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
            {/* Product image */}
            <Link
                href={route('storefront.product', { product: item.slug })}
                className="block aspect-square w-full overflow-hidden bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                tabIndex={0}
            >
                {item.image_url ? (
                    <img
                        src={item.image_url}
                        alt={item.image_alt}
                        className="h-full w-full object-cover transition duration-300 hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-200">
                        <Heart size={40} aria-hidden="true" />
                    </div>
                )}
            </Link>

            {/* Details */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                <Link
                    href={route('storefront.product', { product: item.slug })}
                    className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    {item.name}
                </Link>

                <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-gray-900">
                        {item.price !== null
                            ? formatMoney(item.price, 'MYR')
                            : 'Variable'}
                    </span>
                    <StockBadge inStock={item.in_stock} />
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                    <form onSubmit={handleAddToCart} className="flex-1">
                        <button
                            type="submit"
                            disabled={!item.in_stock || cartForm.processing}
                            aria-label={`Add ${item.name} to cart`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e60012] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c8000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ShoppingCart size={14} aria-hidden="true" />
                            Add to cart
                        </button>
                    </form>

                    <form onSubmit={handleRemove}>
                        <button
                            type="submit"
                            aria-label={`Remove ${item.name} from wishlist`}
                            className="flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:border-red-200 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Wishlist({ items }: WishlistProps) {
    return (
        <AccountLayout activeRoute={route('account.wishlist')} title="Wishlist">
            <Head title="My Wishlist" />

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center">
                    <Heart size={40} className="mb-4 text-gray-200" aria-hidden="true" />
                    <p className="font-medium text-gray-500">Your wishlist is empty.</p>
                    <Link
                        href="/"
                        className="mt-4 text-sm font-medium text-[#e60012] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                    >
                        Start shopping
                    </Link>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                    {items.map((item) => (
                        <WishlistCard key={item.wishlist_id} item={item} />
                    ))}
                </div>
            )}
        </AccountLayout>
    );
}
