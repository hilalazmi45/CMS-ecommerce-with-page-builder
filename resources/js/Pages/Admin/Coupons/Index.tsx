import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { type PaginatedResponse } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Coupon {
    ulid: string;
    code: string;
    type: string;
    amount: number;
    usage_count: number;
    usage_limit: number | null;
    is_active: boolean;
    expires_at: string | null;
}

interface Props {
    coupons: PaginatedResponse<Coupon>;
    filters: { search?: string };
}

function formatAmount(coupon: Coupon): string {
    if (coupon.type === 'percent') return `${(coupon.amount / 100).toFixed(0)}%`;
    return `RM ${(coupon.amount / 100).toFixed(2)}`;
}

export default function CouponsIndex({ coupons, filters: _filters }: Props) {
    const { can } = usePermissions();

    function deleteCoupon(ulid: string) {
        if (confirm('Delete this coupon?')) {
            router.delete(route('admin.coupons.destroy', ulid));
        }
    }

    return (
        <AdminLayout title="Coupons">
            <div className="space-y-4">
                <div className="flex justify-end">
                    {can('promotion.create') && (
                        <Link
                            href={route('admin.coupons.create')}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            New Coupon
                        </Link>
                    )}
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Code</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Amount</th>
                                <th className="px-4 py-3 text-left">Usage</th>
                                <th className="px-4 py-3 text-left">Expires</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {coupons.data.map((coupon) => (
                                <tr key={coupon.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{coupon.code}</td>
                                    <td className="px-4 py-3 capitalize text-gray-600">{coupon.type.replace('_', ' ')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{formatAmount(coupon)}</td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {coupon.usage_count} / {coupon.usage_limit ?? '∞'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {can('promotion.update') && (
                                                <Link href={route('admin.coupons.edit', coupon.ulid)} className="text-gray-400 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </Link>
                                            )}
                                            {can('promotion.delete') && (
                                                <button onClick={() => deleteCoupon(coupon.ulid)} className="text-gray-400 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {coupons.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No coupons yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
