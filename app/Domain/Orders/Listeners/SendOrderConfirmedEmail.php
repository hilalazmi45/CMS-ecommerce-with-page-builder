<?php

declare(strict_types=1);

namespace App\Domain\Orders\Listeners;

use App\Domain\Orders\Events\OrderPlaced;
use App\Domain\Orders\Mail\OrderConfirmedMail;
use App\Domain\Orders\Models\OrderAddress;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Queued listener that sends the order confirmation email after an order is placed.
 *
 * Recipient is the billing address email, falling back to the shipping address
 * email, then the authenticated user's email. If no email can be resolved the
 * listener logs a warning and returns without crashing (CLAUDE.md §13.2).
 *
 * ShouldQueue ensures that mail transport failures never affect the HTTP response
 * or the database transaction that placed the order (CLAUDE.md §4.3).
 */
class SendOrderConfirmedEmail implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        $order = $event->order;
        $order->loadMissing(['addresses', 'customer']);

        $recipient = $this->resolveRecipient($order);

        if ($recipient === null) {
            Log::warning('OrderConfirmedMail: no resolvable recipient email.', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ]);

            return;
        }

        Mail::to($recipient)->queue(new OrderConfirmedMail($order));
    }

    private function resolveRecipient(mixed $order): ?string
    {
        /** @var OrderAddress|null $billing */
        $billing = $order->addresses->firstWhere('type', 'billing');
        if ($billing !== null && is_string($billing->email) && $billing->email !== '') {
            return $billing->email;
        }

        /** @var OrderAddress|null $shipping */
        $shipping = $order->addresses->firstWhere('type', 'shipping');
        if ($shipping !== null && is_string($shipping->email) && $shipping->email !== '') {
            return $shipping->email;
        }

        $customer = $order->customer;
        if ($customer !== null && is_string($customer->email) && $customer->email !== '') {
            return $customer->email;
        }

        return null;
    }
}
