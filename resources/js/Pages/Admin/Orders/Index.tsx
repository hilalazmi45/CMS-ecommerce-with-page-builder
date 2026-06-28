import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { type PaginatedResponse } from '@/types';
import { Eye, Search } from 'lucide-react';
import { useState } from 'react';

interface Order {
    ulid: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    currency: string;
    customer?: { name: string; email: string } | null;
    created_at: string;
}

interface Props {
    orders: PaginatedResponse<Order>;
    filters: { status?: string; search?: string };
}

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-gray-100 text-gray-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
    failed: 'bg-red-200 text-red-800',
};

export default function OrdersIndex({ orders, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    function doSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('admin.orders.index'), { search }, { preserveState: true });
    }

    return (
        <AdminLayout title="Orders">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <form onSubmit={doSearch} className="flex gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Order # or email..."
                                className="rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                            Search
                        </button>
                    </form>
                    {/* Status filter tabs */}
                    <div className="flex gap-1">
                        {['', 'pending', 'processing', 'completed', 'cancelled'].map((s) => (
                            <Link
                                key={s}
                                href={route('admin.orders.index', s ? { status: s } : {})}
                                className={`rounded px-3 py-1.5 text-xs font-medium ${
                                    (filters.status ?? '') === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {s || 'All'}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Order</th>
                                <th className="px-4 py-3 text-left">Customer</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Payment</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.data.map((order) => (
                                <tr key={order.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                                        {order.order_number}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {order.customer ? (
                                            <div>
                                                <div className="font-medium text-gray-900">{order.customer.name}</div>
                                                <div className="text-xs text-gray-500">{order.customer.email}</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">Guest</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs ${order.payment_status === 'paid' ? 'text-green-600' : 'text-gray-500'}`}>
                                            {order.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                        {order.currency} {(order.total / 100).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={route('admin.orders.show', order.ulid)} className="text-gray-400 hover:text-blue-600">
                                            <Eye size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {orders.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No orders found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center gap-1">
                    {orders.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            className={`rounded px-3 py-1.5 text-sm ${link.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'} ${!link.url ? 'cursor-default opacity-40' : ''}`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
