<?php

declare(strict_types=1);

namespace App\Domain\Orders\Events;

use App\Domain\Orders\Models\Order;

/**
 * Dispatched when an order transitions to the 'completed' status, indicating
 * it has been shipped/fulfilled.
 *
 * Dispatch happens in OrderService::updateStatus() when the new status is
 * 'completed', post-commit. Listeners are responsible for sending the
 * shipped confirmation email and any downstream notifications.
 */
final class OrderShipped
{
    public function __construct(
        public readonly Order $order,
    ) {}
}
