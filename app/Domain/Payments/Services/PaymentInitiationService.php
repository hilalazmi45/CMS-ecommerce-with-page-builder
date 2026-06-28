<?php

declare(strict_types=1);

namespace App\Domain\Payments\Services;

use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Payments\ValueObjects\PaymentResult;

/**
 * Initiates payment for an already-persisted order (post-commit).
 *
 * Separation from OrderPlacementService ensures no external network calls are
 * made inside the order-placement DB transaction (CLAUDE.md §10 / §4.3).
 * The controller calls this service after place() returns the durable Order.
 *
 * Redirect gateways (Billplz, PayPal) return PaymentResult::redirect() with a
 * $redirectUrl; the controller must use Inertia::location() or a RedirectResponse
 * to send the customer to that URL.
 *
 * Non-redirect gateways (COD) return PaymentResult::pending() with no URL; the
 * controller redirects directly to the order-confirmation page.
 */
final class PaymentInitiationService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
    ) {}

    /**
     * Initiate payment and update the order's payment_status + payment_reference.
     *
     * Must be called AFTER the placement transaction has committed. For gateways
     * that perform no I/O (COD), this is a lightweight in-process call. For
     * redirect gateways, this makes an external HTTP request and persists a
     * pending PaymentTransaction row.
     */
    public function initiate(Order $order, string $gatewayName, PaymentAttemptData $attempt): PaymentResult
    {
        $gateway = $this->gateways->get($gatewayName);

        $result = $gateway->createPayment($order, $attempt);

        // Map the gateway result status onto the order.
        // RequiresAction is stored as 'pending' on the order until the redirect
        // flow completes and the webhook/callback confirms payment.
        $orderPaymentStatus = $result->status === PaymentStatus::RequiresAction
            ? PaymentStatus::Pending->value
            : $result->status->value;

        $order->update([
            'payment_status' => $orderPaymentStatus,
            'payment_reference' => $result->reference,
        ]);

        return $result;
    }
}
