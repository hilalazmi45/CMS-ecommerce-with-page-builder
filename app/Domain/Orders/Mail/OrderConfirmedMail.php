<?php

declare(strict_types=1);

namespace App\Domain\Orders\Mail;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to the customer immediately after their order is durably placed.
 *
 * Recipient is the billing email (or shipping email as fallback) — resolved
 * and passed by SendOrderConfirmedEmail. The mailable itself is decoupled from
 * recipient resolution to allow unit testing without a database.
 *
 * Implements ShouldQueue so mail failures never block or roll back the HTTP
 * response (CLAUDE.md §4.3 / §10 — email failure must not corrupt order state).
 */
final class OrderConfirmedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Order $order,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Order Confirmed — '.$this->order->order_number,
        );
    }

    public function content(): Content
    {
        $order = $this->order;
        $order->loadMissing(['items', 'addresses']);

        /** @var OrderAddress|null $billing */
        $billing = $order->addresses->firstWhere('type', 'billing');

        /** @var OrderAddress|null $shipping */
        $shipping = $order->addresses->firstWhere('type', 'shipping');

        $billingFirstName = $billing !== null ? (string) $billing->first_name
            : ($shipping !== null ? (string) $shipping->first_name : 'Customer');
        $currency = (string) ($order->currency ?? 'MYR');

        return new Content(
            view: 'mail.orders.confirmed',
            with: [
                'order' => $order,
                'billingFirstName' => $billingFirstName,
                'billingAddress' => $billing,
                'shippingAddress' => $shipping,
                'currency' => $currency,
            ],
        );
    }
}
