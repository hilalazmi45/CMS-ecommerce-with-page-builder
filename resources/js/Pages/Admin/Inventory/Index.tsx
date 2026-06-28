import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { type PageProps, type PaginatedResponse } from '@/types';
import { Search, AlertTriangle, Package } from 'lucide-react';
import { useState, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventoryRow {
    product_id: number;
    variation_id: number | null;
    name: string;
    sku: string | null;
    manage_stock: boolean;
    on_hand: number;
    reserved: number;
    available: number;
    low_stock: boolean;
}

interface Props {
    rows: PaginatedResponse<InventoryRow>;
    filters: {
        search?: string;
        low_stock?: boolean;
    };
}

// ---------------------------------------------------------------------------
// Inline adjust form
// ---------------------------------------------------------------------------

interface AdjustFormProps {
    productId: number;
    variationId: number | null;
}

function AdjustForm({ productId, variationId }: AdjustFormProps) {
    const [delta, setDelta] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const deltaRef = useRef<HTMLInputElement>(null);

    const deltaLabel = `Adjustment (±) for ${variationId ? `variation ${variationId}` : `product ${productId}`}`;
    const noteLabel = `Note for ${variationId ? `variation ${variationId}` : `product ${productId}`}`;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const parsed = parseInt(delta, 10);
        if (!delta || isNaN(parsed) || parsed === 0) {
            deltaRef.current?.focus();
            return;
        }

        setProcessing(true);
        router.post(
            route('admin.inventory.adjust'),
            {
                product_id: productId,
                variation_id: variationId,
                delta: parsed,
                note: note.trim() || null,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setDelta('');
                    setNote('');
                },
            },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
            <label htmlFor={`delta-${productId}-${variationId ?? 'null'}`} className="sr-only">
                {deltaLabel}
            </label>
            <input
                id={`delta-${productId}-${variationId ?? 'null'}`}
                ref={deltaRef}
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="±qty"
                disabled={processing}
                aria-label={deltaLabel}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <label htmlFor={`note-${productId}-${variationId ?? 'null'}`} className="sr-only">
                {noteLabel}
            </label>
            <input
                id={`note-${productId}-${variationId ?? 'null'}`}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                disabled={processing}
                maxLength={500}
                aria-label={noteLabel}
                className="w-36 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={processing || !delta || delta === '0'}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {processing ? 'Saving…' : 'Apply'}
            </button>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InventoryIndex({ rows, filters }: Props) {
    const { flash } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [lowStock, setLowStock] = useState(filters.low_stock ?? false);

    function applyFilters(overrides: { search?: string; low_stock?: boolean } = {}) {
        const params: Record<string, string | boolean> = {};
        const nextSearch = overrides.search ?? search;
        const nextLowStock = overrides.low_stock ?? lowStock;
        if (nextSearch) params.search = nextSearch;
        if (nextLowStock) params.low_stock = true;

        router.get(route('admin.inventory.index'), params, { preserveState: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilters();
    }

    function toggleLowStock() {
        const next = !lowStock;
        setLowStock(next);
        applyFilters({ low_stock: next });
    }

    return (
        <AdminLayout title="Inventory">
            <div className="space-y-4">
                {/* Flash messages */}
                {flash?.success && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                    >
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                        {flash.error}
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                aria-hidden="true"
                            />
                            <label htmlFor="inventory-search" className="sr-only">
                                Search by name or SKU
                            </label>
                            <input
                                id="inventory-search"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or SKU…"
                                className="rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        >
                            Search
                        </button>
                    </form>

                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 select-none">
                        <input
                            type="checkbox"
                            checked={lowStock}
                            onChange={toggleLowStock}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
                        Low stock only
                    </label>

                    <span className="ml-auto text-sm text-gray-500">
                        {rows.total} {rows.total === 1 ? 'row' : 'rows'}
                    </span>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name / SKU</th>
                                <th className="px-4 py-3 text-right">On hand</th>
                                <th className="px-4 py-3 text-right">Reserved</th>
                                <th className="px-4 py-3 text-right">Available</th>
                                <th className="px-4 py-3 text-left">Adjust</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.data.map((row) => {
                                const rowKey = `${row.product_id}-${row.variation_id ?? 'null'}`;
                                return (
                                    <tr
                                        key={rowKey}
                                        className={`hover:bg-gray-50 ${row.low_stock ? 'bg-amber-50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {row.low_stock && (
                                                    <AlertTriangle
                                                        size={14}
                                                        className="shrink-0 text-amber-500"
                                                        aria-label="Low stock"
                                                    />
                                                )}
                                                {!row.manage_stock && (
                                                    <Package
                                                        size={14}
                                                        className="shrink-0 text-gray-300"
                                                        aria-label="Stock not managed"
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {row.name}
                                                    </div>
                                                    {row.sku && (
                                                        <div className="text-xs text-gray-400">
                                                            SKU: {row.sku}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                                            {row.manage_stock ? row.on_hand : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                                            {row.manage_stock ? row.reserved : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {row.manage_stock ? (
                                                <span
                                                    className={
                                                        row.low_stock
                                                            ? 'font-semibold text-amber-600'
                                                            : 'text-gray-900'
                                                    }
                                                >
                                                    {row.available}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <AdjustForm
                                                productId={row.product_id}
                                                variationId={row.variation_id}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No inventory rows found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {rows.links.length > 3 && (
                    <div className="flex justify-center gap-1">
                        {rows.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                className={`rounded px-3 py-1.5 text-sm ${
                                    link.active
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                } ${!link.url ? 'cursor-default opacity-40' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
