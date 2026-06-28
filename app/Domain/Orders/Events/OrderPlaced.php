<?php

declare(strict_types=1);

namespace App\Domain\Orders\Events;

use App\Domain\Orders\Models\Order;

/**
 * Dispatched once, after a new order is durably committed and the idempotency
 * closure returns successfully.
 *
 * The event is dispatched in CheckoutController::store() immediately after the
 * IdempotencyService::remember() work closure completes for the first time.
 * On an idempotent replay the closure does not re-run, so this event is
 * guaranteed to fire exactly once per logical order placement (CLAUDE.md §4.3).
 *
 * Listeners should implement ShouldDispatchAfterCommit or use
 * ShouldQueue with the assumption that the DB transaction has already
 * committed before the closure returned.
 */
final class OrderPlaced
{
    public function __construct(
        public readonly Order $order,
    ) {}
}
