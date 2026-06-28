<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Promotions\Data\CouponLineItem;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Services\CouponService;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a Coupon with sensible defaults.
 */
function makeRulesCoupon(array $overrides = []): Coupon
{
    return Coupon::create(array_merge([
        'ulid' => Str::ulid()->toString(),
        'code' => 'RULE'.strtoupper(uniqid()),
        'type' => 'percent',
        'amount' => 1000, // 10% by default
        'min_spend' => null,
        'max_spend' => null,
        'usage_limit' => null,
        'usage_count' => 0,
        'per_customer_limit' => null,
        'individual_use' => false,
        'exclude_sale_items' => false,
        'allowed_emails' => null,
        'expires_at' => null,
        'is_active' => true,
    ], $overrides));
}

/**
 * Create an active product with the given price and optionally a sale_price.
 */
function makeRulesProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Rules Product',
        'slug' => 'rules-product-'.uniqid(),
        'sku' => 'RPD-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'sale_price' => null,
        'manage_stock' => false,
        'stock_quantity' => 100,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

/**
 * Create a product category.
 */
function makeRulesCategory(array $overrides = []): ProductCategory
{
    return ProductCategory::create(array_merge([
        'name' => 'Rules Category',
        'slug' => 'rules-cat-'.uniqid(),
        'is_active' => true,
    ], $overrides));
}

/**
 * Build a CouponLineItem directly from a product and optional category IDs.
 *
 * @param  list<int>  $categoryIds
 */
function makeLine(
    Product $product,
    int $quantity,
    array $categoryIds = [],
    ?bool $isOnSale = null,
): CouponLineItem {
    $price = $product->effective_price ?? $product->regular_price;

    return new CouponLineItem(
        productId: $product->id,
        categoryIds: $categoryIds,
        unitPrice: (int) $price,
        quantity: $quantity,
        isOnSale: $isOnSale ?? $product->isOnSale(),
    );
}

// ─── Product restriction tests ────────────────────────────────────────────────

it('product-restricted percent coupon discounts only the eligible line subtotal', function () {
    $eligible = makeRulesProduct(['regular_price' => 1000]);
    $ineligible = makeRulesProduct(['regular_price' => 2000]);

    $coupon = makeRulesCoupon(['type' => 'percent', 'amount' => 2000]); // 20%
    // Restrict coupon to $eligible only.
    $coupon->products()->attach($eligible->id, ['is_excluded' => false]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($eligible, 2),    // 2000 eligible
        makeLine($ineligible, 1),  // 2000 ineligible
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 20% of 2000 (eligible only) = 400.
    expect($discount)->toBe(400);
});

// ─── Category restriction tests ───────────────────────────────────────────────

it('category-restricted coupon discounts only lines whose categoryIds intersect', function () {
    $cat = makeRulesCategory();
    $eligible = makeRulesProduct(['regular_price' => 500]);
    $ineligible = makeRulesProduct(['regular_price' => 500]);

    $coupon = makeRulesCoupon(['type' => 'percent', 'amount' => 1000]); // 10%
    $coupon->categories()->attach($cat->id, ['is_excluded' => false]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($eligible, 2, [$cat->id]),   // 1000 eligible
        makeLine($ineligible, 2, []),          // 1000 ineligible (no matching category)
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 10% of 1000 = 100.
    expect($discount)->toBe(100);
});

// ─── Excluded product tests ───────────────────────────────────────────────────

it('excluded product lines are not discounted', function () {
    $excluded = makeRulesProduct(['regular_price' => 1000]);
    $normal = makeRulesProduct(['regular_price' => 1000]);

    $coupon = makeRulesCoupon(['type' => 'percent', 'amount' => 5000]); // 50%
    $coupon->products()->attach($excluded->id, ['is_excluded' => true]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($excluded, 1), // 1000 — excluded
        makeLine($normal, 1),   // 1000 — eligible (no restrictions, no excluded match)
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 50% of 1000 (only normal) = 500.
    expect($discount)->toBe(500);
});

// ─── Excluded category tests ──────────────────────────────────────────────────

it('excluded category lines are not discounted', function () {
    $excludedCat = makeRulesCategory();
    $normalProduct = makeRulesProduct(['regular_price' => 2000]);
    $excludedProduct = makeRulesProduct(['regular_price' => 2000]);

    $coupon = makeRulesCoupon(['type' => 'fixed_cart', 'amount' => 10000]); // large fixed
    $coupon->categories()->attach($excludedCat->id, ['is_excluded' => true]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($normalProduct, 1, []),              // 2000 — eligible
        makeLine($excludedProduct, 1, [$excludedCat->id]), // 2000 — excluded via category
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // Fixed 10000 capped at eligible subtotal 2000.
    expect($discount)->toBe(2000);
});

// ─── exclude_sale_items tests ─────────────────────────────────────────────────

it('exclude_sale_items flag removes on-sale lines from discount calculation', function () {
    $saleProduct = makeRulesProduct(['regular_price' => 2000, 'sale_price' => 1500]);
    $normalProduct = makeRulesProduct(['regular_price' => 1000]);

    $coupon = makeRulesCoupon([
        'type' => 'percent',
        'amount' => 1000, // 10%
        'exclude_sale_items' => true,
    ]);

    $service = app(CouponService::class);

    // Pass isOnSale explicitly to avoid DB date checks in test.
    $lines = [
        new CouponLineItem(
            productId: $saleProduct->id,
            categoryIds: [],
            unitPrice: 1500,
            quantity: 1,
            isOnSale: true,   // on sale — excluded
        ),
        new CouponLineItem(
            productId: $normalProduct->id,
            categoryIds: [],
            unitPrice: 1000,
            quantity: 2,
            isOnSale: false,  // not on sale — eligible
        ),
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 10% of 2000 (normal only) = 200.
    expect($discount)->toBe(200);
});

// ─── Cap at eligible subtotal tests ──────────────────────────────────────────

it('fixed_cart coupon larger than eligible subtotal is capped at eligible subtotal', function () {
    $product = makeRulesProduct(['regular_price' => 300]);

    $coupon = makeRulesCoupon(['type' => 'fixed_cart', 'amount' => 5000]); // 50.00 fixed

    $service = app(CouponService::class);

    $lines = [makeLine($product, 1)]; // eligible subtotal = 300

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // Capped at eligible subtotal.
    expect($discount)->toBe(300);
});

// ─── BOGO tests ───────────────────────────────────────────────────────────────

it('BOGO: qty=1 gives zero discount', function () {
    $product = makeRulesProduct(['regular_price' => 1000]);
    $coupon = makeRulesCoupon(['type' => 'bogo']);

    $service = app(CouponService::class);

    $lines = [makeLine($product, 1)]; // qty 1 — no free unit

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    expect($discount)->toBe(0);
});

it('BOGO: qty=2 gives 1 unit free', function () {
    $product = makeRulesProduct(['regular_price' => 1000]);
    $coupon = makeRulesCoupon(['type' => 'bogo']);

    $service = app(CouponService::class);

    $lines = [makeLine($product, 2)]; // 2 bought → 1 free

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 1 × 1000 = 1000 discount.
    expect($discount)->toBe(1000);
});

it('BOGO: qty=3 gives 1 unit free', function () {
    $product = makeRulesProduct(['regular_price' => 1000]);
    $coupon = makeRulesCoupon(['type' => 'bogo']);

    $service = app(CouponService::class);

    $lines = [makeLine($product, 3)]; // floor(3/2)=1 free

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    expect($discount)->toBe(1000);
});

it('BOGO: qty=4 gives 2 units free', function () {
    $product = makeRulesProduct(['regular_price' => 1000]);
    $coupon = makeRulesCoupon(['type' => 'bogo']);

    $service = app(CouponService::class);

    $lines = [makeLine($product, 4)]; // floor(4/2)=2 free

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 2 × 1000 = 2000 discount.
    expect($discount)->toBe(2000);
});

it('BOGO respects product eligibility — ineligible lines are not discounted', function () {
    $eligible = makeRulesProduct(['regular_price' => 500]);
    $ineligible = makeRulesProduct(['regular_price' => 500]);

    $coupon = makeRulesCoupon(['type' => 'bogo']);
    $coupon->products()->attach($eligible->id, ['is_excluded' => false]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($eligible, 2),   // eligible — floor(2/2)=1 free unit = 500 discount
        makeLine($ineligible, 4), // ineligible (not in product inclusion list)
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // Only 1 free unit from eligible product.
    expect($discount)->toBe(500);
});

it('BOGO respects category eligibility — ineligible category lines not discounted', function () {
    $allowedCat = makeRulesCategory();
    $eligibleProduct = makeRulesProduct(['regular_price' => 800]);
    $otherProduct = makeRulesProduct(['regular_price' => 800]);

    $coupon = makeRulesCoupon(['type' => 'bogo']);
    $coupon->categories()->attach($allowedCat->id, ['is_excluded' => false]);

    $service = app(CouponService::class);

    $lines = [
        makeLine($eligibleProduct, 2, [$allowedCat->id]),  // eligible — 1 free = 800
        makeLine($otherProduct, 2, []),                     // ineligible — no match
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    expect($discount)->toBe(800);
});

// ─── Backward-compat: unrestricted coupon discounts whole cart ────────────────

it('unrestricted percent coupon discounts the whole cart (backward compat)', function () {
    $product1 = makeRulesProduct(['regular_price' => 1000]);
    $product2 = makeRulesProduct(['regular_price' => 2000]);

    $coupon = makeRulesCoupon(['type' => 'percent', 'amount' => 1000]); // 10%, no restrictions

    $service = app(CouponService::class);

    $lines = [
        makeLine($product1, 1), // 1000
        makeLine($product2, 1), // 2000
    ];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    // 10% of 3000 total = 300.
    expect($discount)->toBe(300);
});

it('unrestricted fixed_cart coupon applies to whole eligible subtotal', function () {
    $product = makeRulesProduct(['regular_price' => 5000]);

    $coupon = makeRulesCoupon(['type' => 'fixed_cart', 'amount' => 1000]); // MYR 10 off, no restrictions

    $service = app(CouponService::class);

    $discount = $service->calculateDiscountForLines($coupon, [makeLine($product, 1)]);

    expect($discount)->toBe(1000);
});

// ─── BOGO capped at eligible subtotal ────────────────────────────────────────

it('BOGO discount never exceeds the eligible subtotal', function () {
    // This is an edge-case defensive check.
    // qty=2, price=1, bogo discount=1 which equals the full eligible subtotal.
    $product = makeRulesProduct(['regular_price' => 1]);
    $coupon = makeRulesCoupon(['type' => 'bogo']);

    $service = app(CouponService::class);

    $discount = $service->calculateDiscountForLines($coupon, [makeLine($product, 2)]);

    // eligible subtotal = 2, bogo discount = 1. 1 <= 2 so no cap applies here.
    expect($discount)->toBe(1);
});

// ─── free_shipping type returns zero ─────────────────────────────────────────

it('free_shipping coupon type returns zero from calculateDiscountForLines', function () {
    $product = makeRulesProduct(['regular_price' => 5000]);
    $coupon = makeRulesCoupon(['type' => 'free_shipping', 'amount' => 0]);

    $service = app(CouponService::class);

    $discount = $service->calculateDiscountForLines($coupon, [makeLine($product, 1)]);

    expect($discount)->toBe(0);
});

// ─── No eligible lines ────────────────────────────────────────────────────────

it('returns zero when no lines are eligible due to product restriction', function () {
    $ineligible = makeRulesProduct(['regular_price' => 1000]);
    $allowed = makeRulesProduct(['regular_price' => 1000]);

    $coupon = makeRulesCoupon(['type' => 'percent', 'amount' => 5000]);
    $coupon->products()->attach($allowed->id, ['is_excluded' => false]);

    $service = app(CouponService::class);

    // Only pass ineligible line — allowed product not in the cart.
    $lines = [makeLine($ineligible, 2)];

    $discount = $service->calculateDiscountForLines($coupon, $lines);

    expect($discount)->toBe(0);
});
