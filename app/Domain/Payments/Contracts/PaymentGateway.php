<?php

declare(strict_types=1);

namespace App\Domain\Payments\Contracts;

use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Exceptions\UnsupportedCapabilityException;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Payments\ValueObjects\PaymentResult;
use App\Domain\Payments\ValueObjects\RefundResult;
use App\Domain\Payments\ValueObjects\WebhookResult;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Http\Request;

/**
 * Capability-aware, typed, idempotent payment gateway contract (CLAUDE.md §10.1).
 *
 * Design principles:
 *
 * - Capability checks: callers must call supports() before invoking optional
 *   methods (refund, handleWebhook). Unsupported methods throw
 *   UnsupportedCapabilityException rather than silently no-op.
 *
 * - Typed results: named constructors on PaymentResult / RefundResult / WebhookResult
 *   make valid states explicit. Redirect and synchronous-capture gateways both
 *   satisfy this contract with different result variants.
 *
 * - Idempotency: createPayment receives an idempotency key in PaymentAttemptData.
 *   Implementations must surface or forward it to the provider so repeated calls
 *   with the same key do not create duplicate charges.
 *
 * - No network calls inside a DB transaction: createPayment for redirect/intent
 *   gateways must be called AFTER the transaction that creates the order commits.
 *   COD is the only exception — it performs no I/O and is safe inside the
 *   placement transaction. Document the behaviour in each implementation.
 *
 * Adding a new gateway:
 *   1. Implement this interface in app/Domain/Payments/Gateways/.
 *   2. Register it in AppServiceProvider via PaymentGatewayManager::register().
 *   3. Add its settings to config/commerce.php and .env.example.
 *   4. Add feature tests for all capability paths.
 */
interface PaymentGateway
{
    /**
     * Machine-readable key used to identify this gateway (e.g. 'cod', 'stripe').
     * Must be stable — it is persisted on order records.
     */
    public function name(): string;

    /** Human-readable label shown in checkout UI (e.g. 'Cash on Delivery'). */
    public function label(): string;

    /**
     * Whether this gateway is enabled for use. Callers must check this before
     * presenting the gateway in the checkout UI or accepting it as input.
     */
    public function isEnabled(): bool;

    /**
     * Capability query.
     *
     * Known capability strings:
     *   - 'refund'   — gateway can process online refunds via refund()
     *   - 'webhook'  — gateway sends and handles server-side webhook events
     *   - 'redirect' — gateway flow requires a browser redirect to a hosted page
     *
     * Return false for any capability string that is not explicitly supported.
     */
    public function supports(string $capability): bool;

    /**
     * Initiate a payment for the given order.
     *
     * Implementations must be idempotent for the same $attempt->idempotencyKey.
     * A repeated call with an identical key must return the same logical result
     * without creating a duplicate charge.
     *
     * For gateways that require a browser redirect, return PaymentResult::redirect().
     * For synchronous capture, return PaymentResult::paid().
     * For offline/deferred collection (COD), return PaymentResult::pending().
     *
     * COD note: this method has no network I/O and is safe to call inside the
     * OrderPlacementService transaction. Future gateways that make external HTTP
     * calls MUST be invoked after the transaction commits; the controller is
     * responsible for this sequencing.
     *
     * @throws PaymentException on unrecoverable failure
     */
    public function createPayment(Order $order, PaymentAttemptData $attempt): PaymentResult;

    /**
     * Submit a refund for a previously captured payment.
     *
     * Must not be called when supports('refund') returns false.
     *
     * @param  array<string, mixed>  $context  Gateway-specific context (reason, line items, etc.)
     *
     * @throws UnsupportedCapabilityException when refunds are not supported
     * @throws PaymentException on refund failure
     */
    public function refund(Order $order, Money $amount, array $context): RefundResult;

    /**
     * Verify and process an inbound webhook event from the provider.
     *
     * Must not be called when supports('webhook') returns false.
     * Signature verification must happen before any state mutation (§10.3).
     *
     * @throws UnsupportedCapabilityException when webhooks are not supported
     */
    public function handleWebhook(Request $request): WebhookResult;
}
