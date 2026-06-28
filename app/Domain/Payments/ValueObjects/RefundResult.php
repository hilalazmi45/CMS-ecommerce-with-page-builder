<?php

declare(strict_types=1);

namespace App\Domain\Payments\ValueObjects;

/**
 * Immutable result returned by PaymentGateway::refund().
 *
 * $success   — true when the refund was accepted by the gateway (may be
 *              asynchronous; webhook reconciliation may follow).
 * $reference — provider-assigned refund transaction ID, if available.
 * $meta      — sanitised provider response metadata safe for logging.
 *              Must not contain secrets, full card data, or PII (CLAUDE.md §11.5).
 */
final readonly class RefundResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public bool $success,
        public ?string $reference,
        public array $meta = [],
    ) {}
}
