<?php

declare(strict_types=1);

namespace App\Domain\Cart\Exceptions;

use RuntimeException;

/**
 * Thrown when a cart operation cannot be completed due to a business rule
 * violation — for example, an inactive/non-purchasable product, an invalid
 * quantity, or a cart state that prevents the action.
 *
 * Use App\Domain\Inventory\Exceptions\InsufficientStockException for
 * stock-availability failures.
 */
class CartException extends RuntimeException {}
