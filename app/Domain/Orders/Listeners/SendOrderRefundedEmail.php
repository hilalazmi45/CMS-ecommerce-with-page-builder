<?php

declare(strict_types=1);

namespace App\Domain\Orders\Listeners;

use App\Domain\Orders\Events\OrderRefunded;
use App\Domain\Orders\Mail\OrderRefundedMail;
use App\Domain\Orders\Models\OrderAddress;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Queued listener that sends the refund notification email after a refund
 * is durably committed to the database.
 *
 * The OrderRefunded event is dispatched post-commit by RefundService
 * (only on the first execution, not on idempotent replays — the _dispatched
 * guard in RefundService ensures this). This listener is therefore idempotent
 * in practice.
 *
 * Recipient resolution: billing email → shipping email → user email.
 * A missing email is logged and the listener exits without crashing.
 */
class SendOrderRefundedEmail implements ShouldQueue
{
    public function handle(OrderRefunded $event): void
    {
        $order = $event->order;
        $order->loadMissing(['addresses', 'customer']);

        $recipient = $this->resolveRecipient($order);

        if ($recipient === null) {
            Log::warning('OrderRefundedMail: no resolvable recipient email.', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ]);

            return;
        }

        Mail::to($recipient)->queue(new OrderRefundedMail($order, $event->amount));
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
