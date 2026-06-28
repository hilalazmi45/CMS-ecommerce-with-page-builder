/**
 * Compare page — /compare?ids=1,2,3
 *
 * Shows a side-by-side product comparison table.
 * Reads compare IDs from localStorage on mount; if they differ from the
 * server-provided ids prop, re-navigates to sync them (Inertia router.get).
 *
 * SSR-safe: localStorage access is deferred to useEffect.
 */

import { useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { GitCompare, ShoppingCart, X } from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatMoney } from '@/utils/money';
import { getCompareIds, removeFromCompare, onCompareChange } from '@/utils/compare';
import type { CompareProduct } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompareProps {
    products: CompareProduct[];
    /** IDs the server loaded (from ?ids= query). */
    ids: number[];
}

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

const ATTRIBUTE_ROWS: Array<{ label: string; key: keyof CompareProduct }> = [
    { label: 'Price', key: 'price' },
    { label: 'SKU', key: 'sku' },
    { label: 'Brand', key: 'brand' },
    { label: 'Type', key: 'type' },
    { label: 'Availability', key: 'in_stock' },
];

function cellValue(product: CompareProduct, key: keyof CompareProduct): React.ReactNode {
    const val = product[key];

    if (key === 'price') {
        return val !== null
            ? formatMoney(val as number, 'MYR')
            : 'Variable';
    }

    if (key === 'in_stock') {
        return val
            ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">In stock</span>
            : <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>;
    }

    if (Array.isArray(val)) {
        return val.join(', ') || '—';
    }

    return val != null && val !== '' ? String(val) : '—';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Compare({ products, ids }: CompareProps) {
    // ── Sync localStorage → URL ──────────────────────────────────────────────
    // On mount, read localStorage. If it differs from the URL ids, navigate to
    // reflect the real list. This keeps the URL shareable and the server data
    // accurate.
    useEffect(() => {
        const stored = getCompareIds();

        // Normalise both lists for comparison.
        const storedKey = [...stored].sort().join(',');
        const serverKey = [...ids].sort().join(',');

        if (storedKey !== serverKey) {
            router.get(
                route('compare.index'),
                stored.length > 0 ? { ids: stored.join(',') } : {},
                { replace: true, preserveScroll: true },
            );
        }

        // Subscribe to future changes (from other tabs / widgets).
        return onCompareChange((next) => {
            router.get(
                route('compare.index'),
                next.length > 0 ? { ids: next.join(',') } : {},
                { replace: true, preserveScroll: true },
            );
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function handleRemove(productId: number) {
        removeFromCompare(productId);
    }

    const isEmpty = products.length === 0;

    return (
        <StorefrontLayout>
            <Head title="Compare Products" />

            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">Compare Products</h1>

                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center">
                        <GitCompare size={48} className="mb-4 text-gray-200" aria-hidden="true" />
                        <p className="mb-1 font-medium text-gray-500">No products selected for comparison.</p>
                        <p className="mb-6 text-sm text-gray-400">Browse products and click Compare to add them here.</p>
                        <Link
                            href="/"
                            className="rounded-xl bg-[#e60012] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c8000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                        >
                            Start shopping
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <table className="min-w-full table-fixed divide-y divide-gray-100">
                            {/* Product header row */}
                            <thead>
                                <tr>
                                    {/* Label column */}
                                    <th
                                        scope="col"
                                        className="w-36 px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                                    >
                                        Product
                                    </th>

                                    {products.map((p) => (
                                        <th
                                            key={p.id}
                                            scope="col"
                                            className="px-4 py-4 text-center align-top"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                {/* Remove button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(p.id)}
                                                    aria-label={`Remove ${p.name} from compare`}
                                                    className="self-end rounded-full p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                >
                                                    <X size={14} />
                                                </button>

                                                {/* Product image */}
                                                <Link
                                                    href={route('storefront.product', { product: p.slug })}
                                                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                                >
                                                    {p.image_url ? (
                                                        <img
                                                            src={p.image_url}
                                                            alt={p.image_alt}
                                                            className="mx-auto h-28 w-28 rounded-xl object-cover"
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : (
                                                        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-gray-50 text-gray-200">
                                                            <GitCompare size={32} />
                                                        </div>
                                                    )}
                                                </Link>

                                                {/* Product name */}
                                                <Link
                                                    href={route('storefront.product', { product: p.slug })}
                                                    className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                                >
                                                    {p.name}
                                                </Link>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Attribute rows */}
                            <tbody className="divide-y divide-gray-50">
                                {ATTRIBUTE_ROWS.map(({ label, key }) => (
                                    <tr key={key} className="odd:bg-gray-50/50">
                                        <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            {label}
                                        </td>
                                        {products.map((p) => (
                                            <td
                                                key={p.id}
                                                className="px-4 py-3 text-center text-sm text-gray-700"
                                            >
                                                {cellValue(p, key)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {/* Add to cart row */}
                                <tr>
                                    <td className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Action
                                    </td>
                                    {products.map((p) => (
                                        <td key={p.id} className="px-4 py-4 text-center">
                                            <Link
                                                href={route('storefront.product', { product: p.slug })}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#e60012] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c8000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                            >
                                                <ShoppingCart size={14} aria-hidden="true" />
                                                View product
                                            </Link>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Active count note */}
                {!isEmpty && (
                    <p className="mt-4 text-center text-xs text-gray-400">
                        Comparing {products.length} of 4 possible products.
                        {' '}
                        <button
                            type="button"
                            onClick={() => {
                                products.forEach((p) => removeFromCompare(p.id));
                            }}
                            className="text-[#e60012] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                        >
                            Clear all
                        </button>
                    </p>
                )}
            </div>
        </StorefrontLayout>
    );
}
