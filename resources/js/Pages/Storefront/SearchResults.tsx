/**
 * Storefront Search Results page — /search?q=
 *
 * Receives a paginated list of products and the search query from
 * SearchController::index(). Renders a product grid with pagination
 * links and an empty state when nothing matches.
 *
 * SSR-safe — no browser APIs used at render time.
 */

import { Head, Link } from '@inertiajs/react';
import { Search } from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatMoney } from '@/utils/money';
import type { StorefrontProduct } from '@/pageBuilder/render/StorefrontContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaginationMeta {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface SearchResultsProps {
    query: string;
    products: StorefrontProduct[];
    pagination: PaginationMeta | null;
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ResultCard({ product }: { product: StorefrontProduct }) {
    const img = product.images?.find((i) => i.is_featured) ?? product.images?.[0];
    const price = product.sale_price ?? product.regular_price;
    const isOnSale =
        product.sale_price !== null &&
        product.sale_price !== undefined &&
        product.regular_price !== null &&
        product.regular_price !== undefined &&
        product.sale_price < product.regular_price;

    return (
        <Link
            href={`/product/${product.slug}`}
            className="group flex flex-col rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            {/* Image */}
            <div className="mb-3 aspect-square w-full overflow-hidden rounded-md bg-gray-50">
                {img ? (
                    <img
                        src={img.url}
                        alt={img.alt ?? product.name}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                        🛍
                    </span>
                )}
            </div>

            {/* Brand */}
            {product.brand && (
                <span className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {product.brand.name}
                </span>
            )}

            {/* Name */}
            <p className="mb-2 line-clamp-2 flex-1 text-sm font-medium leading-snug text-gray-800">
                {product.name}
            </p>

            {/* Price */}
            {price !== null && price !== undefined && (
                <div>
                    {isOnSale && product.regular_price !== null && product.regular_price !== undefined && (
                        <p className="text-xs text-gray-400 line-through">
                            {formatMoney(product.regular_price, 'MYR')}
                        </p>
                    )}
                    <p className="text-base font-bold text-blue-700">
                        {formatMoney(price, 'MYR')}
                    </p>
                </div>
            )}

            {/* Stock status */}
            {product.stock_status === 'outofstock' && (
                <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    Out of stock
                </span>
            )}
        </Link>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
    return (
        <div className="py-16 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-gray-700">No results found</h2>
            {query ? (
                <p className="text-sm text-gray-500">
                    No products matched &ldquo;{query}&rdquo;. Try a different search term.
                </p>
            ) : (
                <p className="text-sm text-gray-500">Enter a search term above to find products.</p>
            )}
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ meta, query }: { meta: PaginationMeta; query: string }) {
    if (meta.last_page <= 1) return null;

    const buildUrl = (page: number) => `/search?q=${encodeURIComponent(query)}&page=${page}`;

    return (
        <nav aria-label="Search results pages" className="mt-8 flex items-center justify-center gap-2">
            {meta.prev_page_url && (
                <Link
                    href={buildUrl(meta.current_page - 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Previous
                </Link>
            )}

            <span className="text-sm text-gray-600">
                Page {meta.current_page} of {meta.last_page}
            </span>

            {meta.next_page_url && (
                <Link
                    href={buildUrl(meta.current_page + 1)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Next
                </Link>
            )}
        </nav>
    );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function SearchResults({ query, products, pagination }: SearchResultsProps) {
    const title = query ? `Search results for "${query}"` : 'Search';
    const resultCount = pagination?.total ?? products.length;

    return (
        <StorefrontLayout>
            <Head>
                <title>{title}</title>
                <meta name="robots" content="noindex,follow" />
            </Head>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {query && resultCount > 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                            {resultCount} {resultCount === 1 ? 'result' : 'results'} found
                        </p>
                    )}
                </div>

                {/* Results */}
                {products.length === 0 ? (
                    <EmptyState query={query} />
                ) : (
                    <>
                        <div
                            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
                            aria-label="Search results"
                        >
                            {products.map((product) => (
                                <ResultCard key={product.id} product={product} />
                            ))}
                        </div>

                        {pagination && <Pagination meta={pagination} query={query} />}
                    </>
                )}
            </main>
        </StorefrontLayout>
    );
}
