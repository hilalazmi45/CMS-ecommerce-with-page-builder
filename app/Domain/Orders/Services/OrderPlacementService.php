<?php

declare(strict_types=1);

namespace App\Domain\Orders\Services;

use App\Domain\Cart\Models\Cart;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Inventory\Services\InventoryService;
use App\Domain\Orders\Exceptions\CheckoutException;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Orders\ValueObjects\CheckoutData;
use App\Domain\Orders\ValueObjects\LineItem;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Promotions\Data\CouponLineItem;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Services\CouponService;
use App\Domain\Shipping\Exceptions\ShippingException;
use App\Domain\Shipping\Services\ShippingService;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates the atomic placement of a single order from a cart.
 *
 * This service owns the checkout transaction boundary (CLAUDE.md §4.2).
 * All monetary computation is server-authoritative; no client-supplied totals
 * are accepted (CLAUDE.md §9.2 / §16.2).
 *
 * Separated from OrderService to avoid a circular DI chain:
 *   OrderService ← CartService ← OrderService (loop)
 * CartService only needs OrderService::calculate(); placement uses many more
 * dependencies that should not be injected into the pure calculation service.
 */
class OrderPlacementService
{
    public function __construct(
        private readonly OrderService $orderService,
        private readonly ShippingService $shippingService,
        private readonly CouponService $couponService,
        private readonly InventoryService $inventoryService,
        private readonly TaxService $taxService,
    ) {}

    /**
     * Place an order from a validated cart and checkout data.
     *
     * All business logic — price resolution, coupon validation, tax, shipping,
     * inventory — runs inside one DB::transaction. Server recomputes every
     * monetary value; no client-supplied totals are trusted (CLAUDE.md §16.2).
     *
     * Steps:
     *  1. Load cart items; throw CheckoutException when empty.
     *  2. Per-item: reload product (must be active) + variation; resolve server
     *     unit price; build LineItem; collect snapshot data.
     *  3. Sum subtotal.
     *  4. Coupon: re-validate; if still valid compute discount; if invalid
     *     throw CouponException (per §16.2 — do not silently drop discount).
     *  5. Resolve + validate shipping method (ShippingService::resolveMethod).
     *  6. Compute tax on (subtotal − discount) via TaxService.
     *  7. Calculate final totals.
     *  8. Create Order.
     *  9. Create OrderItems (snapshots).
     * 10. Create billing + shipping OrderAddress rows.
     * 11. Create initial OrderStatusHistory (null → 'pending').
     * 12. Inventory: reserve() then commit() for each line.
     * 13. Coupon redeem if applicable.
     * 14. Clear cart — only after a durable order exists.
     * 15. Return fresh Order with relations.
     *
     * Payment initiation is NOT performed here (CLAUDE.md §10 — no network calls
     * inside a DB transaction). The controller is responsible for calling
     * PaymentInitiationService::initiate() after this method returns.
     *
     * @throws CheckoutException when the cart is empty or a product is inactive
     * @throws ShippingException for invalid method
     * @throws InsufficientStockException for stock races
     * @throws CouponException when a cart coupon is no longer valid or limit is hit
     */
    public function place(Cart $cart, CheckoutData $data, ?User $user, ?string $ipAddress): Order
    {
        return DB::transaction(function () use ($cart, $data, $user, $ipAddress): Order {
            $currency = config('commerce.currency');

            // ── 1. Load cart items ──────────────────────────────────────────
            $cart->load(['items.product', 'items.variation']);
            $cartItems = $cart->items->filter(fn ($i) => $i->product !== null);

            if ($cartItems->isEmpty()) {
                throw new CheckoutException('Cart is empty.');
            }

            // ── 2. Resolve server-authoritative prices + build snapshots ────
            /** @var list<LineItem> $lineItems */
            $lineItems = [];
            /** @var list<array<string, mixed>> $itemSnapshots */
            $itemSnapshots = [];
            /** @var list<CouponLineItem> $couponLines */
            $couponLines = [];

            foreach ($cartItems as $cartItem) {
                /** @var Product|null $product */
                $product = Product::query()->find($cartItem->product_id);
                if ($product === null || $product->status !== 'active') {
                    $productName = $cartItem->product !== null ? $cartItem->product->name : 'Unknown product';
                    throw new CheckoutException("Product \"{$productName}\" is no longer available.");
                }

                /** @var ProductVariation|null $variation */
                $variation = null;
                if ($cartItem->variation_id !== null) {
                    $variation = ProductVariation::query()
                        ->where('id', $cartItem->variation_id)
                        ->where('product_id', $product->id)
                        ->first();

                    if ($variation === null || ! $variation->is_active) {
                        throw new CheckoutException(
                            "A variation of \"{$product->name}\" is no longer available."
                        );
                    }
                }

                $unitPrice = $this->resolveUnitPrice($product, $variation, $currency);
                $lineItems[] = new LineItem($unitPrice, $cartItem->quantity);

                // Line context for coupon eligibility (product/category rules + BOGO).
                $product->loadMissing('categories');
                $couponLines[] = new CouponLineItem(
                    productId: $product->id,
                    categoryIds: $product->categories->pluck('id')->all(),
                    unitPrice: $unitPrice->minor,
                    quantity: $cartItem->quantity,
                    isOnSale: $variation !== null ? ($variation->sale_price !== null) : $product->isOnSale(),
                );

                $itemSnapshots[] = [
                    'product_id' => $product->id,
                    'variation_id' => $variation?->id,
                    'name' => $product->name,
                    'sku' => $variation !== null ? $variation->sku : $product->sku,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $unitPrice->minor,
                    'subtotal' => $unitPrice->multiply($cartItem->quantity)->minor,
                    'discount' => 0,
                    'tax' => 0,
                    'total' => $unitPrice->multiply($cartItem->quantity)->minor,
                    'meta' => $this->variationMeta($variation),
                    // Kept for the inventory step below
                    '_product' => $product,
                    '_variation' => $variation,
                ];
            }

            // ── 3. Subtotal ─────────────────────────────────────────────────
            $subtotal = Money::zero($currency);
            foreach ($lineItems as $line) {
                $subtotal = $subtotal->add($line->lineTotal());
            }

            // ── 4. Coupon ───────────────────────────────────────────────────
            $discountMoney = Money::zero($currency);
            $appliedCoupon = null;

            if ($cart->coupon_code !== null) {
                $result = $this->couponService->validateForCart(
                    $cart->coupon_code,
                    $subtotal->minor,
                    $user?->id,
                    $data->email,
                );

                if ($result['valid']) {
                    /** @var Coupon $coupon */
                    $coupon = $result['coupon'];
                    $discountMinor = $this->couponService->calculateDiscountForLines($coupon, $couponLines);
                    $discountMoney = Money::of($discountMinor, $currency);
                    $appliedCoupon = $coupon;
                } else {
                    // Coupon on the cart is no longer valid at checkout time. Reject the
                    // order — the customer expected the discount (§16.2).
                    throw new CouponException('Your coupon is no longer valid: '.$result['message']);
                }
            }

            // ── 5. Shipping ─────────────────────────────────────────────────
            $shippingMethod = $this->shippingService->resolveMethod(
                $data->shippingMethodId,
                $data->shippingCountry,
                $data->shippingState,
                $subtotal->minor,
            );
            $shippingMoney = Money::of($shippingMethod->cost, $currency);

            // ── 6. Tax ──────────────────────────────────────────────────────
            // Discount is applied before tax (CLAUDE.md §9.8).
            $taxableBase = $subtotal->subtract($discountMoney->min($subtotal));
            $taxBreakdown = $this->taxService->calculate(
                $taxableBase,
                $data->shippingCountry,
                $data->shippingState,
                $data->shippingPostcode,
            );
            $taxMoney = $taxBreakdown->total;

            // ── 7. Totals ───────────────────────────────────────────────────
            $totals = $this->orderService->calculate($lineItems, $discountMoney, $shippingMoney, $taxMoney);

            // ── 8. Create Order ─────────────────────────────────────────────
            $order = Order::create(array_merge($totals->toMinorUnits(), [
                'user_id' => $user?->id,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $data->paymentMethod,
                'currency' => $currency,
                'coupon_code' => $appliedCoupon !== null ? $cart->coupon_code : null,
                'shipping_method' => $shippingMethod->title,
                'customer_note' => $data->customerNote,
                'ip_address' => $ipAddress,
            ]));

            // ── 9. Create OrderItems ────────────────────────────────────────
            foreach ($itemSnapshots as $snap) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $snap['product_id'],
                    'variation_id' => $snap['variation_id'],
                    'name' => $snap['name'],
                    'sku' => $snap['sku'],
                    'quantity' => $snap['quantity'],
                    'unit_price' => $snap['unit_price'],
                    'subtotal' => $snap['subtotal'],
                    'discount' => $snap['discount'],
                    'tax' => $snap['tax'],
                    'total' => $snap['total'],
                    'meta' => $snap['meta'],
                ]);
            }

            // ── 10. Create addresses ────────────────────────────────────────
            $shippingAddr = $data->shippingAddressArray();
            OrderAddress::create([
                'order_id' => $order->id,
                'type' => 'shipping',
                'first_name' => $shippingAddr['first_name'],
                'last_name' => $shippingAddr['last_name'],
                'company' => $shippingAddr['company'] ?? null,
                'address_1' => $shippingAddr['address_1'],
                'address_2' => $shippingAddr['address_2'] ?? null,
                'city' => $shippingAddr['city'],
                'state' => $shippingAddr['state'] ?? null,
                'postcode' => $shippingAddr['postcode'] ?? null,
                'country' => $shippingAddr['country'],
                'phone' => $shippingAddr['phone'] ?? null,
                'email' => $shippingAddr['email'] ?? null,
            ]);

            $billingAddr = $data->billingAddressArray();
            OrderAddress::create([
                'order_id' => $order->id,
                'type' => 'billing',
                'first_name' => $billingAddr['first_name'],
                'last_name' => $billingAddr['last_name'],
                'company' => $billingAddr['company'] ?? null,
                'address_1' => $billingAddr['address_1'],
                'address_2' => $billingAddr['address_2'] ?? null,
                'city' => $billingAddr['city'],
                'state' => $billingAddr['state'] ?? null,
                'postcode' => $billingAddr['postcode'] ?? null,
                'country' => $billingAddr['country'],
                'phone' => $billingAddr['phone'] ?? null,
                'email' => $billingAddr['email'] ?? null,
            ]);

            // ── 11. Status history ──────────────────────────────────────────
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => 'pending',
                'note' => 'Order placed.',
                'is_customer_note' => false,
                'created_by' => null,
            ]);

            // ── 12. Inventory: reserve then commit each line ────────────────
            // Items sorted by product_id for a stable lock order (deadlock prevention).
            $sortedSnapshots = collect($itemSnapshots)->sortBy('product_id')->values();

            foreach ($sortedSnapshots as $snap) {
                /** @var Product $product */
                $product = $snap['_product'];
                /** @var ProductVariation|null $variation */
                $variation = $snap['_variation'];
                $qty = (int) $snap['quantity'];

                // reserve() atomically checks availability under lockForUpdate.
                $this->inventoryService->reserve(
                    $product, $qty, $variation,
                    Order::class, $order->id,
                );

                // commit() reduces both reserved_quantity and stock_quantity.
                $this->inventoryService->commit(
                    $product, $qty, $variation,
                    Order::class, $order->id,
                );
            }

            // ── 13. Coupon redeem ───────────────────────────────────────────
            if ($appliedCoupon !== null) {
                // redeem() re-checks the global limit under lockForUpdate. If
                // another transaction exhausted the limit between step 4 and
                // here, CouponException is thrown and the whole transaction
                // rolls back — including the order, addresses, and stock changes.
                $this->couponService->redeem(
                    $appliedCoupon,
                    $user?->id,
                    $order->id,
                    $totals->discount->minor,
                );
            }

            // ── 14. Clear cart ──────────────────────────────────────────────
            // Delete items directly (not via CartService) to avoid a circular DI
            // chain (CartService → OrderService → OrderPlacementService → CartService).
            $cart->items()->delete();

            // ── 15. Return fresh order with relations ───────────────────────
            // Payment initiation happens post-commit in PaymentInitiationService;
            // the controller calls it after this method returns (CLAUDE.md §10).
            return $order->fresh(['items', 'addresses', 'statusHistory']);
        });
    }

    /**
     * Resolve the server-authoritative unit price for a product/variation line.
     */
    private function resolveUnitPrice(
        Product $product,
        ?ProductVariation $variation,
        string $currency,
    ): Money {
        if ($variation !== null) {
            $minor = $variation->sale_price ?? $variation->regular_price;
        } else {
            $minor = $product->effective_price ?? $product->regular_price;
        }

        return Money::of((int) ($minor ?? 0), $currency);
    }

    /**
     * Build the order-item meta snapshot from a variation's attribute values.
     *
     * @return array<string, mixed>
     */
    private function variationMeta(?ProductVariation $variation): array
    {
        if ($variation === null) {
            return [];
        }

        return ['attribute_values' => $variation->attribute_values ?? []];
    }
}
