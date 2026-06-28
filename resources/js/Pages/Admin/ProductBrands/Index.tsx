import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { type PaginatedResponse } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Trash2, Layers, Pencil } from 'lucide-react';
import { useState } from 'react';

interface Brand {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
}

interface Props {
    brands: PaginatedResponse<Brand>;
}

export default function ProductBrandsIndex({ brands }: Props) {
    const { can } = usePermissions();
    const [editing, setEditing] = useState<Brand | null>(null);

    const form = useForm({ name: '', slug: '', description: '', is_active: true });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editing) form.patch(route('admin.product-brands.update', editing.ulid), { onSuccess: reset });
        else form.post(route('admin.product-brands.store'), { onSuccess: reset });
    }

    function reset() {
        form.reset();
        setEditing(null);
    }

    function startEdit(b: Brand) {
        setEditing(b);
        form.setData({ name: b.name, slug: b.slug, description: b.description ?? '', is_active: b.is_active });
    }

    function remove(ulid: string) {
        if (confirm('Delete this brand?')) router.delete(route('admin.product-brands.destroy', ulid));
    }

    return (
        <AdminLayout title="Brands">
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {brands.data.map((b) => (
                                <tr key={b.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{b.name}<div className="text-xs font-normal text-gray-400">/{b.slug}</div></td>
                                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? 'Active' : 'Hidden'}</span></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {can('catalogue.manage_brands') && (
                                                <a href={route('admin.builder.edit', ['brand', b.ulid])} className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" title="Edit brand page design">
                                                    <Layers size={13} /> Design
                                                </a>
                                            )}
                                            {can('catalogue.manage_brands') && <button onClick={() => startEdit(b)} className="text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>}
                                            {can('catalogue.manage_brands') && <button onClick={() => remove(b.ulid)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {brands.data.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No brands yet.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {can('catalogue.manage_brands') && (
                    <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 self-start">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900">{editing ? <><Pencil size={15} /> Edit Brand</> : <><Plus size={15} /> New Brand</>}</h2>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Name</label>
                            <input type="text" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                            {form.errors.name && <p className="text-xs text-red-600">{form.errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Slug (optional)</label>
                            <input type="text" value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Description</label>
                            <textarea value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} /> Active</label>
                        <div className="flex gap-2">
                            <button type="submit" disabled={form.processing} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
                            {editing && <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-3 text-sm text-gray-600">Cancel</button>}
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
