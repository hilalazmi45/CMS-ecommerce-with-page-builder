import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import type { PageProps, Paginated, User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Pencil, Trash2, UserPlus } from 'lucide-react';

interface Props extends PageProps {
    users: Paginated<User>;
}

export default function UsersIndex({ users }: Props) {
    const { can } = usePermissions();

    function deleteUser(user: User) {
        if (!confirm(`Delete user ${user.name}?`)) return;
        router.delete(route('admin.users.destroy', user.ulid));
    }

    return (
        <AdminLayout title="Users">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">{users.total} users</p>
                {can('user.create') && (
                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <UserPlus size={16} />
                        Add User
                    </Link>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Roles</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                            <th className="px-6 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.data.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {user.roles?.map((r) => r.name).join(', ') ?? '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                    >
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {can('user.update') && (
                                            <Link
                                                href={route('admin.users.edit', user.ulid)}
                                                className="rounded p-1 text-gray-400 hover:text-indigo-600"
                                            >
                                                <Pencil size={16} />
                                            </Link>
                                        )}
                                        {can('user.delete') && (
                                            <button
                                                onClick={() => deleteUser(user)}
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
