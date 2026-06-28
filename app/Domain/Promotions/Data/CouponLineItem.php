<?php

declare(strict_types=1);

namespace App\Domain\Promotions\Data;

final readonly class CouponLineItem
{
    public function __construct(
        public int $productId,
        /** @var list<int> */
        public array $categoryIds,
        public int $unitPrice,   // minor units
        public int $quantity,
        public bool $isOnSale,
    ) {}

    public function lineTotal(): int
    {
        return $this->unitPrice * $this->quantity;
    }
}
