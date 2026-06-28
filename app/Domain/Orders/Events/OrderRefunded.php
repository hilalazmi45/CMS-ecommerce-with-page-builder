<?php

declare(strict_types=1);

namespace App\Domain\Orders\Events;

use App\Domain\Orders\Models\Order;
use App\Domain\Pricing\ValueObjects\Money;

/**
 * Dispatched after a refund is durably committed to the database.
 *
 * The event carries the order and the refunded amount so listeners (email,
 * webhooks, analytics) can react without reloading state. Listeners are
 * deferred until after the transaction commits via ShouldDispatchAfterCommit
 * on the listener class — not required here on the event itself (CLAUDE.md
 * §4.3). Dispatch happens in RefundService, after the DB::transaction().
 */
final class OrderRefunded
{
    public function __construct(
        public readonly Order $order,
        public readonly Money $amount,
    ) {}
}
