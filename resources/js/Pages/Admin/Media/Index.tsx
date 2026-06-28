import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { PageProps, Media, Paginated } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface Props extends PageProps {
    media: Paginated<Media>;
    collection: string | null;
}

export default function MediaIndex({ media }: Props) {
    const { can } = usePermissions();
    const fileInput = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    async function uploadFiles(files: FileList | File[]) {
        if (!can('media.upload')) return;
        setUploading(true);
        const arr = Array.from(files);

        await Promise.all(
            arr.map(async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('collection', 'default');
                const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
                await fetch(route('admin.media.store'), {
                    method: 'POST',
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf },
                    body: fd,
                });
            }),
        );

        setUploading(false);
        router.reload({ only: ['media'] });
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
    }

    function deleteMedia(item: Media) {
        if (!confirm(`Delete "${item.file_name}"?`)) return;
        router.delete(route('admin.media.destroy', item.ulid));
    }

    function formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <AdminLayout title="Media">
            {/* Upload zone */}
            {can('media.upload') && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInput.current?.click()}
                    className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                        dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                >
                    <Upload size={28} className="mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">
                        {uploading ? 'Uploading…' : 'Drag & drop files here, or click to select'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF, SVG, PDF — max 10 MB each</p>
                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }}
                    />
                </div>
            )}

            {/* Stats + pagination info */}
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">{media.total} files</p>
                {media.last_page > 1 && (
                    <div className="flex gap-1">
                        {media.links.map((link, i) => (
                            link.url ? (
                                <button
                                    key={i}
                                    onClick={() => router.get(link.url!)}
                                    className={`min-w-[2rem] rounded px-2 py-1 text-xs ${
                                        link.active
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : null
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            {media.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-gray-400">
                    <ImageIcon size={32} className="mb-2" />
                    <p className="text-sm">No media files yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {media.data.map((item) => (
                        <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white">
                            {/* Thumbnail */}
                            <div className="relative aspect-square bg-gray-100">
                                {item.mime_type.startsWith('image/') ? (
                                    <img
                                        src={item.url}
                                        alt={item.alt ?? item.file_name}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <ImageIcon size={32} className="text-gray-300" />
                                    </div>
                                )}

                                {/* Hover overlay */}
                                {can('media.delete') && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={() => deleteMedia(item)}
                                            className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Meta */}
                            <div className="p-2">
                                <p className="truncate text-xs font-medium text-gray-700" title={item.file_name}>
                                    {item.file_name}
                                </p>
                                <p className="text-xs text-gray-400">{formatBytes(item.size)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
