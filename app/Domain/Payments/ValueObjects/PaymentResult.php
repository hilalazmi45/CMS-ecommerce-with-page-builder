<?php

declare(strict_types=1);

namespace App\Domain\Payments\ValueObjects;

use App\Domain\Payments\Enums\PaymentStatus;

/**
 * Immutable result returned by PaymentGateway::createPayment().
 *
 * Named constructors make intent explicit at the call site and ensure only
 * valid status/redirectUrl combinations can be expressed.
 *
 * - pending()        — Gateway accepted; payment awaits offline collection
 *                      (COD) or asynchronous confirmation (webhook-first).
 * - paid()           — Gateway confirmed capture synchronously.
 * - failed()         — Gateway rejected the attempt.
 * - redirect()       — Gateway requires a browser redirect to complete
 *                      payment (status = RequiresAction). The controller must
 *                      redirect the user to $redirectUrl.
 */
final readonly class PaymentResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public PaymentStatus $status,
        public ?string $reference,
        public ?string $redirectUrl,
        public array $meta,
    ) {}

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function pending(?string $reference = null, array $meta = []): self
    {
        return new self(PaymentStatus::Pending, $reference, null, $meta);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function paid(string $reference, array $meta = []): self
    {
        return new self(PaymentStatus::Paid, $reference, null, $meta);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function failed(?string $reference = null, array $meta = []): self
    {
        return new self(PaymentStatus::Failed, $reference, null, $meta);
    }

    /**
     * Gateway requires the user to be redirected to complete the payment.
     * Status is RequiresAction; the controller is responsible for redirecting.
     *
     * @param  array<string, mixed>  $meta
     */
    public static function redirect(string $url, ?string $reference = null, array $meta = []): self
    {
        return new self(PaymentStatus::RequiresAction, $reference, $url, $meta);
    }
}
