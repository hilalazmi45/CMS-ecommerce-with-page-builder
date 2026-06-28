<?php

declare(strict_types=1);

namespace App\Domain\Orders\ValueObjects;

use App\Domain\Pricing\ValueObjects\Money;
use InvalidArgumentException;

/**
 * A single priced line used as input to order/cart total calculation.
 *
 * Holds the server-authoritative unit price (in minor units) and quantity.
 * This is a pure value object — it carries no Eloquent state and is safe to
 * construct from validated cart/checkout data.
 */
final readonly class LineItem
{
    public function __construct(
        public Money $unitPrice,
        public int $quantity,
    ) {
        if ($quantity < 1) {
            throw new InvalidArgumentException("Line item quantity must be at least 1, got {$quantity}.");
        }
    }

    /** The extended price for this line (unit price × quantity). */
    public function lineTotal(): Money
    {
        return $this->unitPrice->multiply($this->quantity);
    }
}
