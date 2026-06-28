import AdminLayout from '@/Layouts/AdminLayout';
import { useForm, Link } from '@inertiajs/react';
import type { PageProps, Permission } from '@/types';
import PermissionMatrix from '@/Components/rbac/PermissionMatrix';

interface Props extends PageProps {
    permissions: Permission[];
    permissionGroups: Record<string, Record<string, string>>;
}

export default function CreateRole({ permissions, permissionGroups }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        slug: '',
        description: '',
        level: 5,
        permission_ids: [] as number[],
    });

    function handleNameChange(name: string) {
        setData((prev) => ({
            ...prev,
            name,
            slug: prev.slug === toSlug(prev.name) ? toSlug(name) : prev.slug,
        }));
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('admin.roles.store'));
    }

    return (
        <AdminLayout title="Create Role">
            <div className="max-w-3xl">
                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                        <h2 className="text-base font-semibold text-gray-900">Role Details</h2>

                        <Field label="Name" error={errors.name}>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </Field>

                        <Field label="Slug" error={errors.slug}>
                            <input
                                type="text"
                                value={data.slug}
                                onChange={(e) => setData('slug', e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </Field>

                        <Field label="Level (1=highest, 9=lowest)" error={errors.level}>
                            <input
                                type="number"
                                min={2}
                                max={9}
                                value={data.level}
                                onChange={(e) => setData('level', Number(e.target.value))}
                                className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </Field>

                        <Field label="Description" error={errors.description}>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </Field>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h2 className="mb-4 text-base font-semibold text-gray-900">Permissions</h2>
                        <PermissionMatrix
                            permissionGroups={permissionGroups}
                            permissions={permissions}
                            selectedIds={data.permission_ids}
                            onChange={(ids) => setData('permission_ids', ids)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {processing ? 'Creating…' : 'Create Role'}
                        </button>
                        <Link href={route('admin.roles.index')} className="text-sm text-gray-500 hover:text-gray-700">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

function toSlug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
