<?php

declare(strict_types=1);

namespace App\Domain\Orders\ValueObjects;

use App\Domain\Pricing\ValueObjects\Money;

/**
 * Immutable result of a tax calculation: the total tax plus the per-rate lines
 * that produced it.
 */
final readonly class TaxBreakdown
{
    /**
     * @param  list<TaxLine>  $lines
     */
    public function __construct(
        public Money $total,
        public array $lines,
    ) {}

    public static function none(string $currency): self
    {
        return new self(Money::zero($currency), []);
    }
}
