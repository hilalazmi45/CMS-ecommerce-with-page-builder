<?php

declare(strict_types=1);

namespace App\Domain\Cart\Services;

use App\Domain\Cart\Exceptions\CartException;
use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Orders\Services\OrderService;
use App\Domain\Orders\ValueObjects\LineItem;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Promotions\Data\CouponLineItem;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Services\CouponService;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CartService
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly CouponService $couponService,
    ) {}

    /**
     * Resolve the active cart for a user or guest session.
     *
     * For authenticated users, the cart is keyed by user_id. For guests, it
     * is keyed by session_id (the opaque cart token). A new cart is only
     * created when $create is true.
     */
    public function resolve(?User $user, ?string $sessionToken, bool $create = false): ?Cart
    {
        if ($user !== null) {
            $cart = Cart::query()->where('user_id', $user->id)->first();

            if ($cart !== null || ! $create) {
                return $cart;
            }

            return Cart::create([
                'user_id' => $user->id,
                'session_id' => null,
            ]);
        }

        if ($sessionToken === null) {
            if (! $create) {
                return null;
            }

            // A guest cart always needs a session token; caller must supply one.
            return null;
        }

        $cart = Cart::query()->where('session_id', $sessionToken)->first();

        if ($cart !== null || ! $create) {
            return $cart;
        }

        return Cart::create([
            'user_id' => null,
            'session_id' => $sessionToken,
        ]);
    }

    /**
     * Add a product (and optional variation) to the cart.
     *
     * Deduplicates: if a matching line already exists its quantity is
     * incremented. Stock is validated against the new total quantity, but
     * stock is NOT reserved — reservation happens at checkout.
     *
     * @throws CartException if the product is inactive or quantity is < 1
     * @throws InsufficientStockException if managed stock is insufficient
     */
    public function add(Cart $cart, int $productId, int $quantity, ?int $variationId = null): CartItem
    {
        if ($quantity < 1) {
            throw new CartException('Quantity must be at least 1.');
        }

        $product = Product::query()->find($productId);

        if ($product === null || $product->status !== 'active') {
            throw new CartException('Product is not available for purchase.');
        }

        $variation = null;
        if ($variationId !== null) {
            $variation = ProductVariation::query()
                ->where('id', $variationId)
                ->where('product_id', $productId)
                ->first();

            if ($variation === null || ! $variation->is_active) {
                throw new CartException('Product variation is not available.');
            }
        }

        // Determine the existing quantity so we can validate total.
        $existing = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $productId)
            ->where('variation_id', $variationId)
            ->first();

        $existingQty = $existing !== null ? $existing->quantity : 0;
        $totalQty = $existingQty + $quantity;

        $this->assertPurchasable($product, $variation, $totalQty);

        if ($existing !== null) {
            $existing->quantity = $totalQty;
            $existing->save();

            return $existing->refresh();
        }

        return CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $productId,
            'variation_id' => $variationId,
            'quantity' => $quantity,
        ]);
    }

    /**
     * Change the quantity of an existing cart line.
     *
     * @throws CartException if quantity is < 1
     * @throws InsufficientStockException if managed stock is insufficient
     */
    public function updateQuantity(CartItem $item, int $quantity): void
    {
        if ($quantity < 1) {
            throw new CartException('Quantity must be at least 1.');
        }

        $item->loadMissing(['product', 'variation']);

        $this->assertPurchasable($item->product, $item->variation, $quantity);

        $item->quantity = $quantity;
        $item->save();
    }

    /** Remove a single line from the cart. */
    public function remove(CartItem $item): void
    {
        $item->delete();
    }

    /** Remove all lines from the cart (does not delete the cart itself). */
    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
    }

    /**
     * Merge a guest cart into the authenticated user's cart on login.
     *
     * Runs inside a single DB transaction. Quantity conflicts are resolved by
     * capping to the available stock (for managed lines) rather than throwing,
     * so the merge always succeeds. The guest cart is deleted after merging.
     */
    public function mergeOnLogin(User $user, ?string $sessionToken): void
    {
        if ($sessionToken === null) {
            return;
        }

        $guestCart = Cart::query()->where('session_id', $sessionToken)->first();

        if ($guestCart === null) {
            return;
        }

        DB::transaction(function () use ($user, $guestCart): void {
            // Find or create the user's cart.
            $userCart = Cart::query()->where('user_id', $user->id)->first()
                ?? Cart::create(['user_id' => $user->id, 'session_id' => null]);

            $guestCart->load(['items.product', 'items.variation']);

            foreach ($guestCart->items as $guestItem) {
                $product = $guestItem->product;
                $variation = $guestItem->variation;

                if ($product === null) {
                    continue;
                }

                $existing = CartItem::query()
                    ->where('cart_id', $userCart->id)
                    ->where('product_id', $guestItem->product_id)
                    ->where('variation_id', $guestItem->variation_id)
                    ->first();

                $requestedQty = $existing !== null
                    ? $existing->quantity + $guestItem->quantity
                    : $guestItem->quantity;

                // Cap to availability when stock is managed and backorders off.
                $target = $variation ?? $product;
                if ($target->manage_stock && ($target->backorders ?? 'no') === 'no') {
                    $available = ((int) $target->stock_quantity) - ((int) $target->reserved_quantity);
                    $requestedQty = min($requestedQty, max(0, $available));
                }

                if ($requestedQty < 1) {
                    continue;
                }

                if ($existing !== null) {
                    $existing->quantity = $requestedQty;
                    $existing->save();
                } else {
                    CartItem::create([
                        'cart_id' => $userCart->id,
                        'product_id' => $guestItem->product_id,
                        'variation_id' => $guestItem->variation_id,
                        'quantity' => $requestedQty,
                    ]);
                }
            }

            $guestCart->delete();
        });
    }

    /**
     * Build the Inertia-ready cart summary array.
     *
     * Returns zero totals and an empty items array for a null or empty cart.
     * Eager-loads relationships to avoid N+1 queries.
     *
     * @return array{
     *   id: string|null,
     *   item_count: int,
     *   items: list<array{
     *     id: int,
     *     product_id: int,
     *     variation_id: int|null,
     *     name: string,
     *     sku: string|null,
     *     quantity: int,
     *     unit_price: int,
     *     line_total: int,
     *     image: string|null,
     *     url: string,
     *   }>,
     *   currency: string,
     *   totals: array{subtotal: int, discount_total: int, shipping_total: int, tax_total: int, total: int},
     *   applied_coupon: array{code: string, valid: bool, message: string|null, discount: int}|null,
     * }
     */
    public function summarize(?Cart $cart, ?User $user = null): array
    {
        $currency = config('commerce.currency');
        $emptyTotals = $this->orderService->calculate([], Money::zero($currency), Money::zero($currency), Money::zero($currency))->toMinorUnits();

        if ($cart === null) {
            return [
                'id' => null,
                'item_count' => 0,
                'items' => [],
                'currency' => $currency,
                'totals' => $emptyTotals,
                'applied_coupon' => null,
            ];
        }

        // Eager-load to prevent N+1 (include categories and variations for coupon eligibility checks).
        $cart->load(['items.product.images', 'items.product.categories', 'items.product.variations', 'items.variation']);

        $items = $cart->items;

        if ($items->isEmpty()) {
            return [
                'id' => $cart->ulid,
                'item_count' => 0,
                'items' => [],
                'currency' => $currency,
                'totals' => $emptyTotals,
                'applied_coupon' => null,
            ];
        }

        $lineItems = [];
        $couponLines = [];
        $itemRows = [];

        foreach ($items as $cartItem) {
            $product = $cartItem->product;
            $variation = $cartItem->variation;

            if ($product === null) {
                continue;
            }

            $unitPrice = $this->unitPriceFor($product, $variation);
            $lineItems[] = new LineItem($unitPrice, $cartItem->quantity);

            // Build a CouponLineItem for per-line discount eligibility checks.
            $categoryIds = $product->categories->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
            $couponLines[] = new CouponLineItem(
                productId: (int) $product->id,
                categoryIds: $categoryIds,
                unitPrice: $unitPrice->minor,
                quantity: $cartItem->quantity,
                isOnSale: $product->isOnSale(),
            );

            // Primary image URL: first product image or null.
            $image = $product->images->first()?->url;

            $itemRows[] = [
                'id' => $cartItem->id,
                'product_id' => $cartItem->product_id,
                'variation_id' => $cartItem->variation_id,
                'name' => $product->name,
                'sku' => $variation !== null ? $variation->sku : $product->sku,
                'quantity' => $cartItem->quantity,
                'unit_price' => $unitPrice->minor,
                'line_total' => $unitPrice->multiply($cartItem->quantity)->minor,
                'image' => $image ?: null,
                'url' => route('storefront.product', ['product' => $product->slug]),
            ];
        }

        // Compute subtotal for coupon validation (sum of line totals before discount).
        $subtotalMinor = $this->subtotalMinor($cart);

        // Resolve coupon discount.
        $discountMinor = 0;
        $appliedCoupon = null;

        if ($cart->coupon_code !== null) {
            $result = $this->couponService->validateForCart(
                $cart->coupon_code,
                $subtotalMinor,
                $user?->id,
                $user?->email,
            );

            if ($result['valid']) {
                /** @var Coupon $coupon */
                $coupon = $result['coupon'];
                $discountMinor = $this->couponService->calculateDiscountForLines($coupon, $couponLines);
                $appliedCoupon = [
                    'code' => $cart->coupon_code,
                    'valid' => true,
                    'message' => null,
                    'discount' => $discountMinor,
                ];
            } else {
                $appliedCoupon = [
                    'code' => $cart->coupon_code,
                    'valid' => false,
                    'message' => $result['message'],
                    'discount' => 0,
                ];
            }
        }

        $totals = $this->orderService->calculate(
            $lineItems,
            Money::of($discountMinor, $currency),
            Money::zero($currency),
            Money::zero($currency),
        );

        return [
            'id' => $cart->ulid,
            'item_count' => $items->sum('quantity'),
            'items' => $itemRows,
            'currency' => $currency,
            'totals' => $totals->toMinorUnits(),
            'applied_coupon' => $appliedCoupon,
        ];
    }

    /**
     * Apply a coupon code to the cart. Validates eligibility before saving.
     *
     * @throws CouponException when the coupon is invalid for the cart context
     */
    public function applyCoupon(Cart $cart, string $code, ?User $user): void
    {
        $subtotal = $this->subtotalMinor($cart);
        $result = $this->couponService->validateForCart(
            $code,
            $subtotal,
            $user?->id,
            $user?->email,
        );

        if (! $result['valid']) {
            throw new CouponException($result['message']);
        }

        $cart->coupon_code = strtoupper($code);
        $cart->save();
    }

    /** Remove the applied coupon from the cart. */
    public function removeCoupon(Cart $cart): void
    {
        $cart->coupon_code = null;
        $cart->save();
    }

    /**
     * Compute the subtotal (sum of unit_price × quantity) in minor units
     * directly from the cart's current item prices.
     */
    private function subtotalMinor(Cart $cart): int
    {
        $cart->loadMissing(['items.product', 'items.product.categories', 'items.product.variations', 'items.variation']);
        $total = 0;
        foreach ($cart->items as $item) {
            $unitPrice = $this->unitPriceFor($item->product, $item->variation);
            $total += $unitPrice->minor * $item->quantity;
        }

        return $total;
    }

    /**
     * Resolve the server-authoritative unit price for a cart line.
     *
     * Variation price takes precedence over the product effective price.
     * Falls back to regular_price when sale_price is not set.
     */
    private function unitPriceFor(Product $product, ?ProductVariation $variation): Money
    {
        $currency = config('commerce.currency');

        if ($variation !== null) {
            $minor = $variation->sale_price ?? $variation->regular_price;
        } else {
            $minor = $product->effective_price ?? $product->regular_price;
        }

        return Money::of((int) ($minor ?? 0), $currency);
    }

    /**
     * Assert that the product/variation can be purchased in the requested quantity.
     *
     * Stock is unlimited when manage_stock is false OR when backorders != 'no'.
     *
     * @throws InsufficientStockException when available stock is too low
     */
    private function assertPurchasable(Product $product, ?ProductVariation $variation, int $requestedQty): void
    {
        // Use the variation as the stock-bearing target when present.
        $target = $variation ?? $product;

        $manageStock = (bool) ($target->manage_stock ?? false);
        $backorders = (string) ($target->backorders ?? 'no');

        if (! $manageStock || $backorders !== 'no') {
            // Unlimited — no stock check needed.
            return;
        }

        $onHand = (int) ($target->stock_quantity ?? 0);
        $reserved = (int) ($target->reserved_quantity ?? 0);
        $available = $onHand - $reserved;

        if ($available < $requestedQty) {
            throw InsufficientStockException::for($requestedQty, $available);
        }
    }
}
