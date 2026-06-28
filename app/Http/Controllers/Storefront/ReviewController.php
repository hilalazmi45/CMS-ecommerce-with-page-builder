<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Exceptions\ReviewException;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Services\ReviewService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\StoreReviewRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviewService) {}

    /**
     * POST /product/{product:slug}/reviews
     * Route: storefront.product.reviews.store
     * Middleware: auth, throttle:10,1
     */
    public function store(StoreReviewRequest $request, Product $product): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $this->reviewService->submit($product, $user, $request->validated());
        } catch (ReviewException $e) {
            return back()->withErrors(['review' => $e->getMessage()]);
        }

        return back()->with('success', 'Thank you! Your review has been submitted and is pending approval.');
    }
}
