import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Trash2, Layers, Pencil } from 'lucide-react';
import { useState } from 'react';

interface Category {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    parent_id: number | null;
    is_active: boolean;
    parent?: { name: string } | null;
}

interface Props {
    categories: Category[];
}

export default function ProductCategoriesIndex({ categories }: Props) {
    const { can } = usePermissions();
    const [editing, setEditing] = useState<Category | null>(null);

    const form = useForm({ name: '', slug: '', parent_id: '', is_active: true });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            form.patch(route('admin.product-categories.update', editing.ulid), { onSuccess: reset });
        } else {
            form.post(route('admin.product-categories.store'), { onSuccess: reset });
        }
    }

    function reset() {
        form.reset();
        setEditing(null);
    }

    function startEdit(c: Category) {
        setEditing(c);
        form.setData({ name: c.name, slug: c.slug, parent_id: c.parent_id ? String(c.parent_id) : '', is_active: c.is_active });
    }

    function remove(ulid: string) {
        if (confirm('Delete this category?')) router.delete(route('admin.product-categories.destroy', ulid));
    }

    return (
        <AdminLayout title="Product Categories">
            <div className="grid grid-cols-3 gap-6">
                {/* List */}
                <div className="col-span-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Parent</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {categories.map((c) => (
                                <tr key={c.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}<div className="text-xs font-normal text-gray-400">/{c.slug}</div></td>
                                    <td className="px-4 py-3 text-gray-600">{c.parent?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Active' : 'Hidden'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {can('catalogue.manage_categories') && (
                                                <a href={route('admin.builder.edit', ['category', c.ulid])} className="flex items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" title="Edit landing page design">
                                                    <Layers size={13} /> Design
                                                </a>
                                            )}
                                            {can('catalogue.manage_categories') && <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-blue-600"><Pencil size={15} /></button>}
                                            {can('catalogue.manage_categories') && <button onClick={() => remove(c.ulid)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No categories yet.</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Form */}
                {can('catalogue.manage_categories') && (
                    <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 self-start">
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900">{editing ? <><Pencil size={15} /> Edit Category</> : <><Plus size={15} /> New Category</>}</h2>
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
                            <label className="block text-xs font-medium text-gray-600">Parent</label>
                            <select value={form.data.parent_id} onChange={(e) => form.setData('parent_id', e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                                <option value="">— None —</option>
                                {categories.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
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
