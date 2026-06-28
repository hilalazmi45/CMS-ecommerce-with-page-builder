import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

interface Coupon {
    ulid: string;
    code: string;
    type: string;
    amount: number;
    min_spend: number | null;
    max_spend: number | null;
    usage_limit: number | null;
    per_customer_limit: number | null;
    individual_use: boolean;
    exclude_sale_items: boolean;
    expires_at: string | null;
    is_active: boolean;
}

interface Props { coupon?: Coupon; }

export default function CouponForm({ coupon }: Props) {
    const isEdit = !!coupon;

    const { data, setData, post, patch, processing, errors } = useForm({
        code: coupon?.code ?? '',
        type: coupon?.type ?? 'percent',
        amount: coupon?.amount ?? '',
        min_spend: coupon?.min_spend ?? '',
        max_spend: coupon?.max_spend ?? '',
        usage_limit: coupon?.usage_limit ?? '',
        per_customer_limit: coupon?.per_customer_limit ?? '',
        individual_use: coupon?.individual_use ?? false,
        exclude_sale_items: coupon?.exclude_sale_items ?? false,
        expires_at: coupon?.expires_at?.substring(0, 10) ?? '',
        is_active: coupon?.is_active ?? true,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) patch(route('admin.coupons.update', coupon.ulid));
        else post(route('admin.coupons.store'));
    }

    return (
        <AdminLayout title={isEdit ? 'Edit Coupon' : 'New Coupon'}>
            <form onSubmit={submit} className="mx-auto max-w-xl space-y-6">
                <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coupon Code *</label>
                        <input
                            type="text"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.toUpperCase())}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase focus:border-blue-500 focus:outline-none"
                            placeholder="SAVE20"
                        />
                        {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Discount Type *</label>
                            <select
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                            >
                                <option value="percent">Percentage</option>
                                <option value="fixed_cart">Fixed Cart</option>
                                <option value="fixed_product">Fixed Product</option>
                                <option value="free_shipping">Free Shipping</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Amount * {data.type === 'percent' ? '(×100, e.g. 2000 = 20%)' : '(cents)'}
                            </label>
                            <input
                                type="number"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Spend (cents)</label>
                            <input type="number" value={data.min_spend} onChange={(e) => setData('min_spend', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Max Spend (cents)</label>
                            <input type="number" value={data.max_spend} onChange={(e) => setData('max_spend', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Usage Limit (total)</label>
                            <input type="number" value={data.usage_limit} onChange={(e) => setData('usage_limit', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none" placeholder="∞" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Per Customer Limit</label>
                            <input type="number" value={data.per_customer_limit} onChange={(e) => setData('per_customer_limit', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none" placeholder="∞" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                        <input type="date" value={data.expires_at} onChange={(e) => setData('expires_at', e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.individual_use} onChange={(e) => setData('individual_use', e.target.checked)} /> Individual use only</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.exclude_sale_items} onChange={(e) => setData('exclude_sale_items', e.target.checked)} /> Exclude sale items</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} /> Active</label>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        <Save size={16} />
                        {processing ? 'Saving...' : 'Save Coupon'}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
