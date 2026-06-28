<?php

declare(strict_types=1);

namespace App\Domain\Orders\Listeners;

use App\Domain\Orders\Events\OrderShipped;
use App\Domain\Orders\Mail\OrderShippedMail;
use App\Domain\Orders\Models\OrderAddress;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Queued listener that sends the shipment notification email when an order
 * transitions to 'completed'.
 *
 * Recipient resolution follows the same priority as OrderConfirmed:
 * billing email → shipping email → authenticated user email.
 * Missing email is logged and the listener exits cleanly (CLAUDE.md §13.2).
 */
class SendOrderShippedEmail implements ShouldQueue
{
    public function handle(OrderShipped $event): void
    {
        $order = $event->order;
        $order->loadMissing(['items', 'addresses', 'customer']);

        $recipient = $this->resolveRecipient($order);

        if ($recipient === null) {
            Log::warning('OrderShippedMail: no resolvable recipient email.', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ]);

            return;
        }

        Mail::to($recipient)->queue(new OrderShippedMail($order));
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
