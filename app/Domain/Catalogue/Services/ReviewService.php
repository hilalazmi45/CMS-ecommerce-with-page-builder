<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Services;

use App\Domain\Catalogue\Exceptions\ReviewException;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductReview;
use App\Domain\Orders\Models\Order;
use App\Models\User;

class ReviewService
{
    /**
     * Submit a review for a product.
     *
     * Rules:
     * - Only one review per user per product; a duplicate throws ReviewException.
     * - is_verified_purchase is true when the user has at least one completed/paid
     *   order that contains the product.
     * - Reviews default to is_approved = false (pending moderation).
     *
     * @param  array{rating: int, title?: string|null, body: string}  $data
     *
     * @throws ReviewException
     */
    public function submit(Product $product, User $user, array $data): ProductReview
    {
        // One review per user per product.
        $existing = ProductReview::where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing !== null) {
            throw ReviewException::alreadyReviewed();
        }

        $isVerifiedPurchase = $this->hasVerifiedPurchase($product, $user);

        return ProductReview::create([
            'product_id' => $product->id,
            'user_id' => $user->id,
            'author_name' => $user->name,
            'rating' => (int) $data['rating'],
            'title' => $data['title'] ?? null,
            'body' => $data['body'],
            'is_approved' => false,
            'is_verified_purchase' => $isVerifiedPurchase,
        ]);
    }

    /**
     * Approve a pending review.
     */
    public function approve(ProductReview $review): void
    {
        $review->update(['is_approved' => true]);
    }

    /**
     * Hard-delete a review (admin action).
     */
    public function delete(ProductReview $review): void
    {
        $review->delete();
    }

    /**
     * Compute average rating and count over APPROVED reviews only.
     *
     * @return array{average: float|null, count: int}
     */
    public function summary(Product $product): array
    {
        $query = ProductReview::where('product_id', $product->id)
            ->where('is_approved', true);

        $count = $query->count();

        if ($count === 0) {
            return ['average' => null, 'count' => 0];
        }

        $average = round((float) $query->avg('rating'), 1);

        return ['average' => $average, 'count' => $count];
    }

    /**
     * True when the user has at least one completed or paid order containing
     * this product (regardless of variation).
     */
    private function hasVerifiedPurchase(Product $product, User $user): bool
    {
        return Order::where('user_id', $user->id)
            ->whereIn('payment_status', ['paid'])
            ->whereIn('status', ['processing', 'completed'])
            ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
            ->exists();
    }
}
