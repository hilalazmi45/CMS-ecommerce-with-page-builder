<?php

declare(strict_types=1);

namespace App\Domain\Payments\ValueObjects;

use App\Domain\Payments\Enums\PaymentStatus;

/**
 * Immutable result returned by PaymentGateway::handleWebhook().
 *
 * $handled     — true when the gateway recognised and processed the event.
 * $orderUlid   — the order ULID extracted from the event, if identifiable.
 * $newStatus   — the payment status the order should transition to, if the
 *                event carries a status update. Null means no status change.
 * $meta        — sanitised event metadata safe for structured logging.
 *                Must not contain secrets or sensitive payment payloads.
 */
final readonly class WebhookResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public bool $handled,
        public ?string $orderUlid,
        public ?PaymentStatus $newStatus,
        public array $meta = [],
    ) {}

    /**
     * Use when the gateway does not support webhooks or the event is not
     * relevant to this gateway (e.g. COD, wrong provider).
     */
    public static function ignored(): self
    {
        return new self(false, null, null, []);
    }
}
