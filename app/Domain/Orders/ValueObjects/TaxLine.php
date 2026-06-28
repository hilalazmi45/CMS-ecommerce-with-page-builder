<?php

declare(strict_types=1);

namespace App\Domain\Orders\ValueObjects;

use App\Domain\Pricing\ValueObjects\Money;

/**
 * A single applied tax rate and the amount it contributed, snapshotted so the
 * order can record exactly how tax was computed (CLAUDE.md §9.8).
 */
final readonly class TaxLine
{
    public function __construct(
        public string $name,
        public float $rate,
        public Money $amount,
        public bool $isCompound,
    ) {}
}
