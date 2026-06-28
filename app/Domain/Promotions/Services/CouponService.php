<?php

declare(strict_types=1);

namespace App\Domain\Promotions\Services;

use App\Domain\Promotions\Data\CouponLineItem;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Models\CouponUsage;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CouponService
{
    public function paginate(int $perPage = 20, array $filters = []): LengthAwarePaginator
    {
        $query = Coupon::query()->latest();

        if (! empty($filters['search'])) {
            $query->where('code', 'like', "%{$filters['search']}%");
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        return $query->paginate($perPage);
    }

    public function findByCode(string $code): ?Coupon
    {
        return Coupon::where('code', strtoupper($code))->first();
    }

    public function create(array $data): Coupon
    {
        $data['code'] = strtoupper($data['code']);
        $coupon = Coupon::create($data);
        ActivityLogger::log('promotions', 'coupon_created', Coupon::class, $coupon->id, null, $coupon->toArray());

        return $coupon;
    }

    public function update(Coupon $coupon, array $data): Coupon
    {
        $old = $coupon->toArray();
        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }
        $coupon->update($data);
        ActivityLogger::log('promotions', 'coupon_updated', Coupon::class, $coupon->id, $old, $coupon->toArray());

        return $coupon;
    }

    public function delete(Coupon $coupon): void
    {
        ActivityLogger::log('promotions', 'coupon_deleted', Coupon::class, $coupon->id, $coupon->toArray(), null);
        $coupon->delete();
    }

    public function validate(string $code, int $cartTotal, ?int $userId = null): array
    {
        $coupon = $this->findByCode($code);

        if (! $coupon) {
            return ['valid' => false, 'message' => 'Coupon not found.'];
        }

        if (! $coupon->isValid()) {
            return ['valid' => false, 'message' => 'Coupon is not valid or has expired.'];
        }

        if ($coupon->min_spend && $cartTotal < $coupon->min_spend) {
            return ['valid' => false, 'message' => 'Minimum spend not met.'];
        }

        if ($coupon->max_spend && $cartTotal > $coupon->max_spend) {
            return ['valid' => false, 'message' => 'Maximum spend exceeded.'];
        }

        return ['valid' => true, 'coupon' => $coupon];
    }

    public function calculateDiscount(Coupon $coupon, int $cartTotal): int
    {
        return match ($coupon->type) {
            'percent' => (int) round($cartTotal * ($coupon->amount / 10000)),
            'fixed_cart' => min($coupon->amount, $cartTotal),
            default => 0,
        };
    }

    /**
     * Calculate the discount for a set of cart line items, respecting
     * product/category inclusion and exclusion rules as well as BOGO logic.
     *
     * Each line must carry the server-authoritative productId, categoryIds,
     * unitPrice (minor units), quantity, and isOnSale flag.
     *
     * Coupon type semantics:
     *   percent      — amount is percent×100 (e.g. 20% = 2000).
     *   fixed_cart   — amount in minor units, applied to eligible subtotal.
     *   fixed_product — same as fixed_cart (applied to eligible lines).
     *   free_shipping — returns 0 (shipping handled separately).
     *   bogo         — buy-N-get-one-free per pair: qty=1→0 free, qty=2→1 free,
     *                  qty=3→1 free, qty=4→2 free. Discounts are modelled as a
     *                  monetary amount; no cart line is added or mutated.
     *
     * @param  list<CouponLineItem>  $lines
     */
    public function calculateDiscountForLines(Coupon $coupon, array $lines): int
    {
        // Eager-load product and category restrictions once.
        $coupon->loadMissing(['products', 'categories']);

        // Partition restriction lists.
        /** @var list<int> $includedProductIds */
        $includedProductIds = [];
        /** @var list<int> $excludedProductIds */
        $excludedProductIds = [];

        foreach ($coupon->products as $product) {
            /** @phpstan-ignore property.notFound */
            if ($product->pivot->is_excluded) {
                $excludedProductIds[] = $product->id;
            } else {
                $includedProductIds[] = $product->id;
            }
        }

        /** @var list<int> $includedCategoryIds */
        $includedCategoryIds = [];
        /** @var list<int> $excludedCategoryIds */
        $excludedCategoryIds = [];

        foreach ($coupon->categories as $category) {
            /** @phpstan-ignore property.notFound */
            if ($category->pivot->is_excluded) {
                $excludedCategoryIds[] = $category->id;
            } else {
                $includedCategoryIds[] = $category->id;
            }
        }

        $hasProductInclusions = count($includedProductIds) > 0;
        $hasCategoryInclusions = count($includedCategoryIds) > 0;

        // Determine eligible lines.
        $eligibleLines = array_filter($lines, function (CouponLineItem $line) use (
            $hasProductInclusions,
            $hasCategoryInclusions,
            $includedProductIds,
            $excludedProductIds,
            $includedCategoryIds,
            $excludedCategoryIds,
            $coupon,
        ): bool {
            // Exclusion check: if product or any of its categories are explicitly excluded, skip.
            if (in_array($line->productId, $excludedProductIds, true)) {
                return false;
            }
            foreach ($line->categoryIds as $catId) {
                if (in_array($catId, $excludedCategoryIds, true)) {
                    return false;
                }
            }

            // Exclude on-sale items when configured.
            if ($coupon->exclude_sale_items && $line->isOnSale) {
                return false;
            }

            // Inclusion check: if no inclusions defined, the line passes.
            if (! $hasProductInclusions && ! $hasCategoryInclusions) {
                return true;
            }

            // At least one inclusion rule exists — the line must match at least one.
            if ($hasProductInclusions && in_array($line->productId, $includedProductIds, true)) {
                return true;
            }
            if ($hasCategoryInclusions && count(array_intersect($line->categoryIds, $includedCategoryIds)) > 0) {
                return true;
            }

            return false;
        });

        // Compute eligible subtotal.
        $eligibleSubtotal = 0;
        foreach ($eligibleLines as $line) {
            $eligibleSubtotal += $line->lineTotal();
        }

        if ($eligibleSubtotal === 0) {
            return 0;
        }

        $discount = match ($coupon->type) {
            'percent' => (int) round($eligibleSubtotal * ($coupon->amount / 10000)),
            'fixed_cart', 'fixed_product' => min($coupon->amount, $eligibleSubtotal),
            'free_shipping' => 0,
            'bogo' => $this->calculateBogoDiscount($eligibleLines, $eligibleSubtotal),
            default => 0,
        };

        // Never exceed the eligible subtotal.
        return min($discount, $eligibleSubtotal);
    }

    /**
     * Compute the BOGO discount across eligible lines.
     *
     * Semantics: for every pair purchased, the buyer gets one unit free.
     * qty=1 → 0 free, qty=2 → 1 free, qty=3 → 1 free, qty=4 → 2 free.
     *
     * @param  array<int|string, CouponLineItem>  $eligibleLines
     */
    private function calculateBogoDiscount(array $eligibleLines, int $eligibleSubtotal): int
    {
        $discount = 0;

        foreach ($eligibleLines as $line) {
            if ($line->quantity < 2) {
                continue;
            }
            $freeUnits = (int) floor($line->quantity / 2);
            $discount += $freeUnits * $line->unitPrice;
        }

        return min($discount, $eligibleSubtotal);
    }

    /**
     * Validate a coupon code for a specific cart context.
     *
     * @return array{valid: true, coupon: Coupon}|array{valid: false, message: string}
     */
    public function validateForCart(
        string $code,
        int $cartSubtotal,
        ?int $userId,
        ?string $email
    ): array {
        $coupon = $this->findByCode($code);

        if ($coupon === null) {
            return ['valid' => false, 'message' => 'Coupon code not found.'];
        }

        if (! $coupon->isValid()) {
            return ['valid' => false, 'message' => 'This coupon is no longer valid.'];
        }

        if ($coupon->min_spend !== null && $cartSubtotal < $coupon->min_spend) {
            $formatted = number_format($coupon->min_spend / 100, 2);

            return ['valid' => false, 'message' => "Minimum spend of {$formatted} required for this coupon."];
        }

        if ($coupon->max_spend !== null && $cartSubtotal > $coupon->max_spend) {
            $formatted = number_format($coupon->max_spend / 100, 2);

            return ['valid' => false, 'message' => "Maximum spend of {$formatted} exceeded for this coupon."];
        }

        if ($coupon->allowed_emails !== null && count($coupon->allowed_emails) > 0) {
            if ($email === null) {
                return ['valid' => false, 'message' => 'This coupon is restricted to specific email addresses.'];
            }
            $normalised = array_map('strtolower', $coupon->allowed_emails);
            if (! in_array(strtolower($email), $normalised, true)) {
                return ['valid' => false, 'message' => 'This coupon is not valid for your account.'];
            }
        }

        if ($coupon->per_customer_limit !== null && $userId !== null) {
            $usageCount = $coupon->usages()->where('user_id', $userId)->count();
            if ($usageCount >= $coupon->per_customer_limit) {
                return ['valid' => false, 'message' => 'You have already used this coupon the maximum number of times.'];
            }
        }

        return ['valid' => true, 'coupon' => $coupon];
    }

    /**
     * Atomically record a coupon redemption against an order.
     *
     * Locks the coupon row, re-checks the global usage limit, increments the
     * counter, and writes a coupon_usages audit row carrying the discount amount
     * applied (needed for refund allocation, §9.7). Intended to be called inside
     * the checkout transaction once the order exists.
     *
     * @throws CouponException if the global usage limit is already reached
     */
    public function redeem(Coupon $coupon, ?int $userId, int $orderId, int $discountAmount): void
    {
        DB::transaction(function () use ($coupon, $userId, $orderId, $discountAmount): void {
            /** @var Coupon $locked */
            $locked = Coupon::lockForUpdate()->findOrFail($coupon->id);

            if ($locked->isUsageLimitReached()) {
                throw new CouponException('This coupon has reached its usage limit.');
            }

            $locked->increment('usage_count');

            CouponUsage::create([
                'coupon_id' => $coupon->id,
                'order_id' => $orderId,
                'user_id' => $userId,
                'discount_amount' => $discountAmount,
            ]);
        });
    }
}
