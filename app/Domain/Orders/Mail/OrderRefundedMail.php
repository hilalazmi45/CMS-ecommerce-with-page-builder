<?php

declare(strict_types=1);

namespace App\Domain\Orders\Mail;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent after a refund is durably committed, carrying the refunded Money amount.
 *
 * The Money value object is not serialised by Eloquent — it is reconstructed
 * in content() from the minor-unit integer stored on the mailable so queue
 * serialisation is safe (CLAUDE.md §10.5).
 *
 * Implements ShouldQueue — email failure must never roll back or corrupt a
 * completed refund (CLAUDE.md §4.3).
 */
final class OrderRefundedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** @var int Refund amount in minor units (e.g. cents/sen). */
    public readonly int $refundAmountMinor;

    public readonly string $refundCurrency;

    public function __construct(
        public readonly Order $order,
        Money $amount,
    ) {
        $this->refundAmountMinor = $amount->minor;
        $this->refundCurrency = $amount->currency;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Refund Processed — '.$this->order->order_number,
        );
    }

    public function content(): Content
    {
        $order = $this->order;
        $order->loadMissing(['addresses']);

        /** @var OrderAddress|null $billing */
        $billing = $order->addresses->firstWhere('type', 'billing');

        /** @var OrderAddress|null $shipping */
        $shipping = $order->addresses->firstWhere('type', 'shipping');

        $billingFirstName = $billing !== null ? (string) $billing->first_name
            : ($shipping !== null ? (string) $shipping->first_name : 'Customer');
        $currency = $this->refundCurrency !== '' ? $this->refundCurrency : (string) ($order->currency ?? 'MYR');

        return new Content(
            view: 'mail.orders.refunded',
            with: [
                'order' => $order,
                'billingFirstName' => $billingFirstName,
                'refundAmountMinor' => $this->refundAmountMinor,
                'currency' => $currency,
            ],
        );
    }
}
