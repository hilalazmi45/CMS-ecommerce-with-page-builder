<?php

declare(strict_types=1);

namespace App\Domain\Payments\ValueObjects;

/**
 * Contextual data a gateway needs to initiate a payment.
 *
 * - $idempotencyKey  — caller-generated key; prevents duplicate charges on
 *                      retry. Must be unique per intended transaction attempt.
 * - $returnUrl       — URL the gateway should redirect the customer to after a
 *                      successful payment (used by redirect-flow gateways).
 * - $cancelUrl       — URL for cancelled/failed gateway redirects.
 * - $input           — Additional gateway-specific or UI-supplied parameters
 *                      (e.g. Stripe PaymentMethod ID). Gateways must validate
 *                      any values they consume. Treat as untrusted input.
 *
 * COD ignores $returnUrl, $cancelUrl, and $input. Future redirect gateways
 * (FPX, PayPal) will use them.
 */
final readonly class PaymentAttemptData
{
    /**
     * @param  array<string, mixed>  $input
     */
    public function __construct(
        public string $idempotencyKey,
        public string $returnUrl,
        public string $cancelUrl,
        public array $input = [],
    ) {}
}
