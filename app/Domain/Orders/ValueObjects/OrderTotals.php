<?php

declare(strict_types=1);

namespace App\Domain\Orders\ValueObjects;

use App\Domain\Pricing\ValueObjects\Money;

/**
 * Immutable result of an order/cart total calculation.
 *
 * All figures are Money (integer minor units). The invariant is:
 *   total = (subtotal − discount) + shipping + tax
 * where discount is already capped so it never exceeds subtotal.
 */
final readonly class OrderTotals
{
    public function __construct(
        public Money $subtotal,
        public Money $discount,
        public Money $shipping,
        public Money $tax,
        public Money $total,
    ) {}

    /**
     * Flatten to the integer minor-unit columns persisted on the orders table.
     *
     * @return array{subtotal: int, discount_total: int, shipping_total: int, tax_total: int, total: int}
     */
    public function toMinorUnits(): array
    {
        return [
            'subtotal' => $this->subtotal->minor,
            'discount_total' => $this->discount->minor,
            'shipping_total' => $this->shipping->minor,
            'tax_total' => $this->tax->minor,
            'total' => $this->total->minor,
        ];
    }
}
