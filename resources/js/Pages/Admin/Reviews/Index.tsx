import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router, usePage } from '@inertiajs/react';
import type { PageProps, PaginatedResponse } from '@/types';
import { Star, CheckCircle, Trash2, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewProduct {
    id: number;
    name: string;
    slug: string;
}

interface ReviewUser {
    id: number;
    name: string;
    email: string;
}

export interface ReviewRow {
    id: number;
    ulid: string;
    author_name: string;
    rating: number;
    title: string | null;
    excerpt: string;
    is_approved: boolean;
    is_verified_purchase: boolean;
    created_at: string | null;
    product: ReviewProduct | null;
    user: ReviewUser | null;
}

interface Props {
    reviews: PaginatedResponse<ReviewRow>;
    filters: {
        status: 'pending' | 'approved' | 'all';
    };
}

// ---------------------------------------------------------------------------
// Star display
// ---------------------------------------------------------------------------

function Stars({ value }: { value: number }) {
    return (
        <span
            className="inline-flex items-center gap-0.5"
            aria-label={`${value} out of 5 stars`}
            role="img"
        >
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    size={13}
                    className={i < value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                    aria-hidden="true"
                />
            ))}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewsIndex({ reviews, filters }: Props) {
    const { flash } = usePage<PageProps>().props;

    function setStatus(status: string) {
        router.get(route('admin.reviews.index'), { status }, { preserveState: false });
    }

    function handleApprove(ulid: string) {
        router.patch(
            route('admin.reviews.approve', { review: ulid }),
            {},
            { preserveScroll: true },
        );
    }

    function handleDelete(ulid: string) {
        if (!confirm('Delete this review? This action cannot be undone.')) return;
        router.delete(route('admin.reviews.destroy', { review: ulid }), {
            preserveScroll: true,
        });
    }

    const tabClass = (tab: string) =>
        `rounded px-3 py-1.5 text-sm font-medium ${
            filters.status === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
        }`;

    return (
        <AdminLayout title="Product Reviews">
            <div className="space-y-4">
                {/* Flash messages */}
                {flash?.success && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                    >
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                        {flash.error}
                    </div>
                )}

                {/* Filter tabs */}
                <div className="flex items-center gap-2">
                    <button className={tabClass('pending')} onClick={() => setStatus('pending')}>
                        Pending
                    </button>
                    <button className={tabClass('approved')} onClick={() => setStatus('approved')}>
                        Approved
                    </button>
                    <button className={tabClass('all')} onClick={() => setStatus('all')}>
                        All
                    </button>
                    <span className="ml-auto text-sm text-gray-500">
                        {reviews.total} {reviews.total === 1 ? 'review' : 'reviews'}
                    </span>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Reviewer</th>
                                <th className="px-4 py-3 text-left">Product</th>
                                <th className="px-4 py-3 text-left">Rating</th>
                                <th className="px-4 py-3 text-left">Excerpt</th>
                                <th className="px-4 py-3 text-left">Flags</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reviews.data.map((review) => (
                                <tr key={review.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">
                                            {review.author_name}
                                        </div>
                                        {review.user && (
                                            <div className="text-xs text-gray-400">
                                                {review.user.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {review.product ? (
                                            <span className="font-medium text-gray-700">
                                                {review.product.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Stars value={review.rating} />
                                    </td>
                                    <td className="max-w-xs px-4 py-3">
                                        {review.title && (
                                            <p className="font-medium text-gray-900">{review.title}</p>
                                        )}
                                        <p className="text-gray-500">{review.excerpt}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {review.is_approved && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                    <CheckCircle size={11} aria-hidden="true" />
                                                    Approved
                                                </span>
                                            )}
                                            {review.is_verified_purchase && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                                    <ShieldCheck size={11} aria-hidden="true" />
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                                        {review.created_at ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {!review.is_approved && (
                                                <button
                                                    onClick={() => handleApprove(review.ulid)}
                                                    className="rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                                                    aria-label={`Approve review by ${review.author_name}`}
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(review.ulid)}
                                                className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                                                aria-label={`Delete review by ${review.author_name}`}
                                            >
                                                <Trash2 size={13} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reviews.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No reviews found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {reviews.links.length > 3 && (
                    <div className="flex justify-center gap-1">
                        {reviews.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url ?? '#'}
                                className={`rounded px-3 py-1.5 text-sm ${
                                    link.active
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                } ${!link.url ? 'cursor-default opacity-40' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
