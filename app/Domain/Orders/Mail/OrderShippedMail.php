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
 * Sent when the order transitions to 'completed' (shipped/fulfilled).
 *
 * Implements ShouldQueue — transport failure must not affect order state
 * (CLAUDE.md §4.3).
 */
final class OrderShippedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Order $order,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Order Has Been Shipped — '.$this->order->order_number,
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
            view: 'mail.orders.shipped',
            with: [
                'order' => $order,
                'billingFirstName' => $billingFirstName,
                'shippingAddress' => $shipping,
                'currency' => $currency,
            ],
        );
    }
}
