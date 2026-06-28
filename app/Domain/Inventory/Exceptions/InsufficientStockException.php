<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exceptions;

use RuntimeException;

/**
 * Thrown when a stock reservation cannot be satisfied because the available
 * quantity (on hand − reserved) is lower than the requested amount and
 * backorders are not permitted.
 */
class InsufficientStockException extends RuntimeException
{
    public static function for(int $requested, int $available): self
    {
        return new self("Insufficient stock: requested {$requested}, only {$available} available.");
    }
}
