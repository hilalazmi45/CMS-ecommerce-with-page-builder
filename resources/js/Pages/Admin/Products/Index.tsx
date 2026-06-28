import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { type PaginatedResponse } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Product {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    sku: string | null;
    regular_price: number | null;
    sale_price: number | null;
    stock_quantity: number | null;
    is_featured: boolean;
    brand?: { name: string } | null;
    categories?: { name: string }[];
}

interface Props {
    products: PaginatedResponse<Product>;
    filters: { search?: string; status?: string; type?: string };
}

function formatPrice(cents: number | null): string {
    if (cents === null) return '—';
    return `RM ${(cents / 100).toFixed(2)}`;
}

export default function ProductsIndex({ products, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('admin.products.index'), { search }, { preserveState: true });
    }

    function deleteProduct(ulid: string) {
        if (confirm('Delete this product?')) {
            router.delete(route('admin.products.destroy', ulid));
        }
    }

    return (
        <AdminLayout title="Products">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <form onSubmit={doSearch} className="flex gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search products..."
                                className="rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                            Search
                        </button>
                    </form>
                    {can('catalogue.create') && (
                        <Link
                            href={route('admin.products.create')}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            Add Product
                        </Link>
                    )}
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">SKU</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Price</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Stock</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.data.map((product) => (
                                <tr key={product.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {product.name}
                                        {product.is_featured && (
                                            <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">Featured</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{product.sku ?? '—'}</td>
                                    <td className="px-4 py-3 capitalize text-gray-600">{product.type}</td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {product.sale_price ? (
                                            <>
                                                <span className="mr-1 text-gray-400 line-through">{formatPrice(product.regular_price)}</span>
                                                <span className="text-green-600">{formatPrice(product.sale_price)}</span>
                                            </>
                                        ) : (
                                            formatPrice(product.regular_price)
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            product.status === 'active' ? 'bg-green-100 text-green-700' :
                                            product.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{product.stock_quantity ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {can('catalogue.update') && (
                                                <Link
                                                    href={route('admin.products.edit', product.ulid)}
                                                    className="text-gray-400 hover:text-blue-600"
                                                >
                                                    <Edit size={16} />
                                                </Link>
                                            )}
                                            {can('catalogue.delete') && (
                                                <button
                                                    onClick={() => deleteProduct(product.ulid)}
                                                    className="text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {products.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination links */}
                <div className="flex justify-center gap-1">
                    {products.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            className={`rounded px-3 py-1.5 text-sm ${
                                link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                            } ${!link.url ? 'cursor-default opacity-40' : ''}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
