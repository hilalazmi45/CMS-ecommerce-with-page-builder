<?php

declare(strict_types=1);

namespace App\Domain\Payments\Gateways;

use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Payments\Exceptions\UnsupportedCapabilityException;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Payments\ValueObjects\PaymentResult;
use App\Domain\Payments\ValueObjects\RefundResult;
use App\Domain\Payments\ValueObjects\WebhookResult;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Http\Request;

/**
 * Cash on Delivery gateway — the reference implementation of PaymentGateway.
 *
 * COD requires no external API calls; payment is collected offline on delivery.
 * As a result:
 *   - supports('refund')   → false  (no online refund flow; handle manually)
 *   - supports('webhook')  → false  (no provider events)
 *   - supports('redirect') → false  (no hosted-page redirect)
 *
 * createPayment() is safe to call inside the OrderPlacementService DB transaction
 * because it performs no network I/O. It records a PaymentTransaction row so
 * every payment attempt has an audit trail even for offline methods.
 *
 * Future network-calling gateways (Stripe, FPX) must be invoked AFTER the
 * transaction commits; the controller is responsible for that sequencing.
 */
class CodGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'cod';
    }

    public function label(): string
    {
        return 'Cash on Delivery';
    }

    public function isEnabled(): bool
    {
        return (bool) config('commerce.payments.cod.enabled', true);
    }

    /**
     * COD has no online payment capabilities; all capabilities are false.
     */
    public function supports(string $capability): bool
    {
        return false;
    }

    /**
     * Record a pending PaymentTransaction and return a pending result.
     *
     * The transaction row is the audit trail for "COD selected at checkout".
     * Payment status remains 'pending' until the order is fulfilled and
     * payment collected manually by the merchant.
     *
     * Safe to call inside a DB transaction (no I/O).
     */
    public function createPayment(Order $order, PaymentAttemptData $attempt): PaymentResult
    {
        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => $this->name(),
            'status' => 'pending',
            'amount' => $order->total,
            'reference' => null,
            'payload' => [
                'idempotency_key' => $attempt->idempotencyKey,
            ],
        ]);

        return PaymentResult::pending();
    }

    /**
     * COD does not support online refunds.
     *
     * @throws UnsupportedCapabilityException always
     */
    public function refund(Order $order, Money $amount, array $context): RefundResult
    {
        throw new UnsupportedCapabilityException(
            'Cash on Delivery does not support online refunds. Process the refund manually.'
        );
    }

    /**
     * COD does not receive webhook events.
     */
    public function handleWebhook(Request $request): WebhookResult
    {
        return WebhookResult::ignored();
    }
}
