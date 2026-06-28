/**
 * ProductReviews — storefront reviews section.
 *
 * Renders the rating summary, list of approved reviews, and a submission form
 * for authenticated users. All user content is rendered through React text
 * nodes (no dangerouslySetInnerHTML). SSR-safe.
 */

import { useForm, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReviewItem {
    id: number;
    ulid: string;
    author_name: string;
    rating: number;
    title: string | null;
    body: string;
    is_verified_purchase: boolean;
    created_at: string | null;
}

export interface ReviewSummary {
    average: number | null;
    count: number;
}

interface Props {
    reviews: ReviewItem[];
    reviewSummary: ReviewSummary;
    /** POST url for submitting a new review */
    submitUrl: string;
    /** Whether the current user has already reviewed this product */
    userHasReviewed?: boolean;
}

// ---------------------------------------------------------------------------
// StarRating helpers
// ---------------------------------------------------------------------------

interface StarRatingProps {
    value: number;
    max?: number;
    label?: string;
}

function StarRating({ value, max = 5, label }: StarRatingProps) {
    const filled = Math.round(value);
    return (
        <span
            className="inline-flex items-center gap-0.5"
            aria-label={label ?? `${value} out of ${max} stars`}
            role="img"
        >
            {Array.from({ length: max }, (_, i) => (
                <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`h-4 w-4 ${i < filled ? 'text-amber-400' : 'text-gray-200'}`}
                    aria-hidden="true"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Interactive star picker (for the form)
// ---------------------------------------------------------------------------

interface StarPickerProps {
    value: number;
    onChange: (v: number) => void;
}

function StarPicker({ value, onChange }: StarPickerProps) {
    return (
        <fieldset>
            <legend className="sr-only">Select a rating</legend>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer">
                        <input
                            type="radio"
                            name="rating"
                            value={star}
                            checked={value === star}
                            onChange={() => onChange(star)}
                            className="sr-only"
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`h-7 w-7 transition-colors ${
                                star <= value ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
                            }`}
                            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

// ---------------------------------------------------------------------------
// Review form
// ---------------------------------------------------------------------------

function ReviewForm({ submitUrl }: { submitUrl: string }) {
    const { data, setData, post, processing, errors: formErrors, reset, wasSuccessful } = useForm({
        rating: 0,
        title: '',
        body: '',
    });

    // Server may inject custom error keys (e.g. 'review') outside the typed
    // form field set. Use a wider map for display purposes.
    const errors = formErrors as Record<string, string | undefined>;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(submitUrl, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    if (wasSuccessful) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800"
            >
                Thank you! Your review has been submitted and is pending approval.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Write a review</h3>

            {/* Global review error (e.g. already reviewed) */}
            {errors.review && (
                <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errors.review}
                </div>
            )}

            {/* Rating */}
            <div>
                <StarPicker value={data.rating} onChange={(v) => setData('rating', v)} />
                {errors.rating && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.rating}
                    </p>
                )}
            </div>

            {/* Title */}
            <div>
                <label htmlFor="review-title" className="block text-sm font-medium text-gray-700">
                    Review title (optional)
                </label>
                <input
                    id="review-title"
                    type="text"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    maxLength={150}
                    disabled={processing}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    aria-describedby={errors.title ? 'review-title-error' : undefined}
                />
                {errors.title && (
                    <p id="review-title-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.title}
                    </p>
                )}
            </div>

            {/* Body */}
            <div>
                <label htmlFor="review-body" className="block text-sm font-medium text-gray-700">
                    Review <span aria-hidden="true">*</span>
                </label>
                <textarea
                    id="review-body"
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    rows={4}
                    maxLength={5000}
                    required
                    disabled={processing}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    aria-describedby={errors.body ? 'review-body-error' : undefined}
                />
                {errors.body && (
                    <p id="review-body-error" className="mt-1 text-xs text-red-600" role="alert">
                        {errors.body}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={processing || data.rating === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {processing ? 'Submitting…' : 'Submit review'}
            </button>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProductReviews({
    reviews,
    reviewSummary,
    submitUrl,
    userHasReviewed = false,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const isAuthenticated = auth.user !== null;

    return (
        <section aria-labelledby="reviews-heading" className="mt-12 border-t border-gray-100 pt-10">
            <h2 id="reviews-heading" className="text-xl font-semibold text-gray-900">
                Customer Reviews
            </h2>

            {/* Summary */}
            {reviewSummary.count > 0 && reviewSummary.average !== null ? (
                <div className="mt-4 flex items-center gap-3">
                    <span className="text-3xl font-bold text-gray-900" aria-hidden="true">
                        {reviewSummary.average.toFixed(1)}
                    </span>
                    <div>
                        <StarRating
                            value={reviewSummary.average}
                            label={`${reviewSummary.average.toFixed(1)} out of 5 stars`}
                        />
                        <p className="mt-0.5 text-sm text-gray-500">
                            Based on{' '}
                            <span className="font-medium text-gray-700">{reviewSummary.count}</span>{' '}
                            {reviewSummary.count === 1 ? 'review' : 'reviews'}
                        </p>
                    </div>
                </div>
            ) : (
                <p className="mt-3 text-sm text-gray-500">No reviews yet. Be the first to review this product.</p>
            )}

            {/* Review list */}
            {reviews.length > 0 && (
                <ul className="mt-8 space-y-6" aria-label="Customer reviews">
                    {reviews.map((review) => (
                        <li
                            key={review.ulid}
                            className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <StarRating
                                        value={review.rating}
                                        label={`Rated ${review.rating} out of 5 stars`}
                                    />
                                    {review.title && (
                                        <p className="mt-1 font-semibold text-gray-900">{review.title}</p>
                                    )}
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    <span>{review.author_name}</span>
                                    {review.created_at && (
                                        <span className="ml-2">{review.created_at}</span>
                                    )}
                                    {review.is_verified_purchase && (
                                        <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                                            Verified purchase
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-gray-700">{review.body}</p>
                        </li>
                    ))}
                </ul>
            )}

            {/* Submission form */}
            <div className="mt-10">
                {!isAuthenticated ? (
                    <p className="text-sm text-gray-500">
                        <a href={route('login')} className="font-medium text-blue-600 underline">
                            Log in
                        </a>{' '}
                        to write a review.
                    </p>
                ) : userHasReviewed ? (
                    <p className="text-sm text-gray-500">You have already submitted a review for this product.</p>
                ) : (
                    <ReviewForm submitUrl={submitUrl} />
                )}
            </div>
        </section>
    );
}
