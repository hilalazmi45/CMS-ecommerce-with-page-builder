<?php

declare(strict_types=1);

namespace App\Domain\Pricing\Enums;

/**
 * Explicit rounding strategy for converting fractional minor-unit amounts
 * (e.g. the result of a percentage tax/discount) back to whole minor units.
 *
 * Rounding must always be explicit and tested — never left to implicit float
 * behaviour (CLAUDE.md §9.1).
 */
enum RoundingMode: string
{
    case HalfUp = 'half_up';
    case HalfDown = 'half_down';
    case Floor = 'floor';
    case Ceiling = 'ceiling';
}
