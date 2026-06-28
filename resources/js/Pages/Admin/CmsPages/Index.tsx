import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { type PaginatedResponse } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface CmsPage {
    ulid: string;
    title: string;
    slug: string;
    status: string;
    published_at: string | null;
    created_at: string;
    created_by?: { name: string } | null;
}

interface Props {
    pages: PaginatedResponse<CmsPage>;
    filters: { status?: string; search?: string };
}

export default function CmsPagesIndex({ pages, filters }: Props) {
    const { can } = usePermissions();

    function deletePage(ulid: string) {
        if (confirm('Delete this page?')) {
            router.delete(route('admin.cms-pages.destroy', ulid));
        }
    }

    return (
        <AdminLayout title="Pages">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {['', 'draft', 'published', 'archived'].map((s) => (
                            <Link
                                key={s}
                                href={route('admin.cms-pages.index', s ? { status: s } : {})}
                                className={`rounded px-3 py-1.5 text-xs font-medium ${(filters.status ?? '') === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {s || 'All'}
                            </Link>
                        ))}
                    </div>
                    {can('cms.create') && (
                        <Link
                            href={route('admin.cms-pages.create')}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus size={16} />
                            New Page
                        </Link>
                    )}
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Title</th>
                                <th className="px-4 py-3 text-left">Slug</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Published</th>
                                <th className="px-4 py-3 text-left">Author</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pages.data.map((page) => (
                                <tr key={page.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{page.title}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">/{page.slug}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                            page.status === 'published' ? 'bg-green-100 text-green-700' :
                                            page.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                            {page.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {page.published_at ? new Date(page.published_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{page.created_by?.name ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {can('cms.update') && (
                                                <Link href={route('admin.cms-pages.edit', page.ulid)} className="text-gray-400 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </Link>
                                            )}
                                            {can('cms.delete') && (
                                                <button onClick={() => deletePage(page.ulid)} className="text-gray-400 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pages.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No pages yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
