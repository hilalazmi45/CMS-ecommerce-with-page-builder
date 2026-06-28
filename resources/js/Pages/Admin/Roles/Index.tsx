import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import type { PageProps, Role } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Pencil, Trash2, ShieldPlus, Lock } from 'lucide-react';

interface Props extends PageProps {
    roles: (Role & { users_count: number; permissions_count: number })[];
}

export default function RolesIndex({ roles }: Props) {
    const { can } = usePermissions();

    function deleteRole(role: Role) {
        if (role.is_system_role) return;
        if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
        router.delete(route('admin.roles.destroy', role.ulid));
    }

    return (
        <AdminLayout title="Roles">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">{roles.length} roles</p>
                {can('role.create') && (
                    <Link
                        href={route('admin.roles.create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <ShieldPlus size={16} />
                        New Role
                    </Link>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Level</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Permissions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Users</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
                            <th className="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {roles.map((role) => (
                            <tr key={role.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{role.name}</p>
                                        <p className="text-xs text-gray-400">{role.slug}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{role.level}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{role.permissions_count}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{role.users_count}</td>
                                <td className="px-6 py-4">
                                    {role.is_system_role ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                            <Lock size={10} /> System
                                        </span>
                                    ) : (
                                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                            Custom
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {can('role.update') && !role.is_system_role && (
                                            <Link
                                                href={route('admin.roles.edit', role.ulid)}
                                                className="rounded p-1 text-gray-400 hover:text-indigo-600"
                                            >
                                                <Pencil size={16} />
                                            </Link>
                                        )}
                                        {can('role.delete') && !role.is_system_role && (
                                            <button
                                                onClick={() => deleteRole(role)}
                                                className="rounded p-1 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
