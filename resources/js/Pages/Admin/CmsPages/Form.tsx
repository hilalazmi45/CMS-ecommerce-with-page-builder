import AdminLayout from '@/Layouts/AdminLayout';
import { Link, useForm } from '@inertiajs/react';
import { Save, Layers } from 'lucide-react';

interface CmsPage {
    ulid: string;
    title: string;
    slug: string;
    status: string;
    template: string;
    meta_title: string | null;
    meta_description: string | null;
    latest_revision?: { content: Record<string, unknown> } | null;
}

interface Props { page?: CmsPage; }

export default function CmsPageForm({ page }: Props) {
    const isEdit = !!page;

    const { data, setData, post, patch, processing, errors } = useForm({
        title: page?.title ?? '',
        slug: page?.slug ?? '',
        status: page?.status ?? 'draft',
        template: page?.template ?? 'default',
        meta_title: page?.meta_title ?? '',
        meta_description: page?.meta_description ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) patch(route('admin.cms-pages.update', page.ulid));
        else post(route('admin.cms-pages.store'));
    }

    return (
        <AdminLayout title={isEdit ? 'Edit Page' : 'New Page'}>
            <div className="mx-auto max-w-2xl space-y-6">
                <form onSubmit={submit} className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
                        <h2 className="font-semibold text-gray-900">Page Settings</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title *</label>
                            <input
                                type="text"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Slug</label>
                                <input
                                    type="text"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="auto-generated"
                                />
                                {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
                        <h2 className="font-semibold text-gray-900">SEO</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Meta Title</label>
                            <input
                                type="text"
                                value={data.meta_title}
                                onChange={(e) => setData('meta_title', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                            <textarea
                                value={data.meta_description}
                                onChange={(e) => setData('meta_description', e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            {isEdit && (
                                <Link
                                    href={route('admin.builder.edit', ['page', page.ulid])}
                                    className="flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                    <Layers size={16} />
                                    Open Page Builder
                                </Link>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save size={16} />
                            {processing ? 'Saving...' : 'Save Page'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
