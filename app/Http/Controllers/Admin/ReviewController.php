<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Catalogue\Models\ProductReview;
use App\Domain\Catalogue\Services\ReviewService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviewService) {}

    /**
     * GET /admin/reviews
     * Name: admin.reviews.index
     */
    public function index(Request $request): Response
    {
        $this->authorize('reviews.moderate');

        $status = $request->query('status', 'pending'); // pending | approved | all

        $query = ProductReview::query()
            ->with(['product:id,name,slug', 'user:id,name,email'])
            ->latest('created_at');

        if ($status === 'pending') {
            $query->where('is_approved', false);
        } elseif ($status === 'approved') {
            $query->where('is_approved', true);
        }

        $reviews = $query->paginate(20)->through(fn (ProductReview $r) => [
            'id' => $r->id,
            'ulid' => $r->ulid,
            'author_name' => $r->author_name,
            'rating' => $r->rating,
            'title' => $r->title,
            'excerpt' => mb_strimwidth($r->body, 0, 150, '…'),
            'is_approved' => $r->is_approved,
            'is_verified_purchase' => $r->is_verified_purchase,
            'created_at' => $r->created_at?->toDateTimeString(),
            'product' => $r->product ? [
                'id' => $r->product->id,
                'name' => $r->product->name,
                'slug' => $r->product->slug,
            ] : null,
            'user' => $r->user ? [
                'id' => $r->user->id,
                'name' => $r->user->name,
                'email' => $r->user->email,
            ] : null,
        ]);

        return Inertia::render('Admin/Reviews/Index', [
            'reviews' => $reviews,
            'filters' => ['status' => $status],
        ]);
    }

    /**
     * PATCH /admin/reviews/{review:ulid}/approve
     * Name: admin.reviews.approve
     */
    public function approve(ProductReview $review): RedirectResponse
    {
        $this->authorize('reviews.moderate');

        $this->reviewService->approve($review);

        return back()->with('success', 'Review approved.');
    }

    /**
     * DELETE /admin/reviews/{review:ulid}
     * Name: admin.reviews.destroy
     */
    public function destroy(ProductReview $review): RedirectResponse
    {
        $this->authorize('reviews.moderate');

        $this->reviewService->delete($review);

        return back()->with('success', 'Review deleted.');
    }
}
