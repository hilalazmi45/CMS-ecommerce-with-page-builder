<?php

declare(strict_types=1);

namespace App\Domain\Payments\Gateways;

use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Contracts\PaymentGateway;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Exceptions\UnsupportedCapabilityException;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Payments\ValueObjects\PaymentResult;
use App\Domain\Payments\ValueObjects\RefundResult;
use App\Domain\Payments\ValueObjects\WebhookResult;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Stripe Payment Intents gateway — card-present and card-not-present payments
 * via Stripe's client-intent flow.
 *
 * Flow:
 *  1. createPayment() creates a PaymentIntent on Stripe and records a pending
 *     PaymentTransaction. Returns PaymentResult::pending() with the
 *     client_secret in $meta — the frontend uses this with Stripe Elements to
 *     confirm the payment. Order stays payment_status = 'pending' until the
 *     webhook confirms capture.
 *  2. Stripe POSTs a `payment_intent.succeeded` event to /webhooks/stripe
 *     (StripeWebhookController). handleWebhook() verifies the Stripe-Signature
 *     header and returns a WebhookResult with PaymentStatus::Paid.
 *  3. The browser redirect is NOT used to mark an order as paid (§10.3).
 *
 * NOTE — Frontend deferred intentionally:
 *   The Stripe Elements / Stripe.js frontend (loading the publishable key,
 *   rendering the payment form, calling stripe.confirmPayment()) is NOT built
 *   here. It requires a real publishable key and the @stripe/stripe-js SDK.
 *   The client_secret returned in PaymentResult::pending() meta is the
 *   integration point a future Elements implementation will consume.
 *
 * Capabilities:
 *   - supports('redirect')  → false  (client-intent, not redirect-based)
 *   - supports('webhook')   → true
 *   - supports('refund')    → true
 *
 * Secrets: secret_key and webhook_secret are loaded from config only. They are
 * never logged, returned to the browser, or included in Inertia props (§10.4).
 *
 * Disabled by default (STRIPE_ENABLED=false). Enable only after sandbox
 * credentials are verified and the webhook signature has been tested (§16.3).
 */
class StripeGateway implements PaymentGateway
{
    private const STRIPE_API_BASE = 'https://api.stripe.com/v1';

    /** Webhook timestamp tolerance in seconds — Stripe recommends 300 s. */
    private const WEBHOOK_TOLERANCE_SECONDS = 300;

    public function name(): string
    {
        return 'stripe';
    }

    public function label(): string
    {
        return 'Card (Stripe)';
    }

    public function isEnabled(): bool
    {
        if (! (bool) config('commerce.payments.stripe.enabled', false)) {
            return false;
        }

        // All three credentials must be present for the gateway to function.
        return ! empty(config('commerce.payments.stripe.secret_key'))
            && ! empty(config('commerce.payments.stripe.webhook_secret'));
    }

    public function supports(string $capability): bool
    {
        return in_array($capability, ['webhook', 'refund'], true);
    }

    /**
     * Create a Stripe PaymentIntent and return a pending PaymentResult.
     *
     * The returned $meta['client_secret'] is intended for a future Stripe
     * Elements frontend to call stripe.confirmPayment(). Do NOT expose the
     * full secret_key — only the client_secret is safe to send to the browser.
     *
     * MUST be called AFTER the order-placement transaction commits (§10 / §4.3).
     * Makes an external HTTP request — never call inside DB::transaction().
     *
     * @throws PaymentException when the Stripe API rejects the request
     */
    public function createPayment(Order $order, PaymentAttemptData $attempt): PaymentResult
    {
        $response = Http::withToken((string) config('commerce.payments.stripe.secret_key'))
            ->timeout(30)
            ->connectTimeout(10)
            ->asForm()
            ->post(self::STRIPE_API_BASE.'/payment_intents', [
                'amount' => $order->total,
                'currency' => strtolower((string) $order->currency),
                'metadata[order_ulid]' => $order->ulid,
                'automatic_payment_methods[enabled]' => 'true',
            ]);

        if ($response->failed()) {
            Log::warning('Stripe PaymentIntent creation failed', [
                'order_id' => $order->id,
                'status' => $response->status(),
                // Never log the full response body — may contain sensitive data
                'error_type' => $response->json('error.type') ?? 'unknown',
                'error_code' => $response->json('error.code') ?? 'unknown',
            ]);

            throw new PaymentException(
                "Stripe PaymentIntent creation failed (HTTP {$response->status()}). Please try again."
            );
        }

        $intent = $response->json();
        $intentId = (string) ($intent['id'] ?? '');
        $clientSecret = (string) ($intent['client_secret'] ?? '');

        // Record a pending PaymentTransaction immediately for the audit trail —
        // even if the customer never completes the Stripe payment form.
        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => $this->name(),
            'status' => 'pending',
            'amount' => $order->total,
            'reference' => $intentId ?: null,
            'payload' => [
                // Sanitised subset — never include the secret_key, webhook_secret,
                // or full card data in the payload (§10.2, §11.5)
                'payment_intent_id' => $intentId,
                'currency' => $intent['currency'] ?? null,
                'idempotency_key' => $attempt->idempotencyKey,
            ],
        ]);

        // client_secret is safe to hand to the browser (it is a per-intent
        // token that can only confirm *this* intent, not make new charges).
        return PaymentResult::pending(
            reference: $intentId ?: null,
            meta: ['client_secret' => $clientSecret],
        );
    }

    /**
     * Refund a previously captured Stripe PaymentIntent.
     *
     * Uses the Stripe Refunds API. Requires that the order has a
     * payment_reference set to the PaymentIntent ID from capture.
     *
     * @param  array<string, mixed>  $context
     *
     * @throws UnsupportedCapabilityException never (this gateway supports refunds)
     * @throws PaymentException on refund failure
     */
    public function refund(Order $order, Money $amount, array $context): RefundResult
    {
        $paymentIntentId = (string) ($order->payment_reference ?? '');

        if ($paymentIntentId === '') {
            throw new PaymentException(
                'Cannot refund: order has no payment reference (Stripe PaymentIntent ID).'
            );
        }

        $response = Http::withToken((string) config('commerce.payments.stripe.secret_key'))
            ->timeout(30)
            ->connectTimeout(10)
            ->asForm()
            ->post(self::STRIPE_API_BASE.'/refunds', [
                'payment_intent' => $paymentIntentId,
                'amount' => $amount->minor,
            ]);

        if ($response->failed()) {
            Log::warning('Stripe refund failed', [
                'order_id' => $order->id,
                'payment_intent' => $paymentIntentId,
                'status' => $response->status(),
                'error_code' => $response->json('error.code') ?? 'unknown',
            ]);

            throw new PaymentException(
                "Stripe refund failed (HTTP {$response->status()})."
            );
        }

        $refund = $response->json();
        $refundId = (string) ($refund['id'] ?? '');

        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => $this->name(),
            'status' => 'refunded',
            'amount' => $amount->minor,
            'reference' => $refundId ?: null,
            'payload' => [
                'type' => 'refund',
                'payment_intent_id' => $paymentIntentId,
                'refund_id' => $refundId,
                'refund_status' => $refund['status'] ?? null,
            ],
        ]);

        return new RefundResult(
            success: true,
            reference: $refundId ?: null,
            meta: ['payment_intent' => $paymentIntentId],
        );
    }

    /**
     * Verify a Stripe webhook event and return a WebhookResult.
     *
     * Verification follows §10.3 and Stripe's webhook signature specification:
     *  1. Parse the `Stripe-Signature` header: `t=<timestamp>,v1=<sig>`.
     *  2. Construct the signed payload: `{timestamp}.{rawBody}`.
     *  3. Compute HMAC-SHA256 with the webhook_secret.
     *  4. Compare with hash_equals to prevent timing attacks.
     *  5. Verify the timestamp is within WEBHOOK_TOLERANCE_SECONDS to prevent
     *     replay attacks.
     *  6. Only parse/act on the event after all verification passes.
     *
     * Supported events:
     *   - `payment_intent.succeeded` → PaymentStatus::Paid
     *   - All other event types      → WebhookResult::ignored()
     *
     * The controller is responsible for state mutations after this returns.
     */
    public function handleWebhook(Request $request): WebhookResult
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Stripe-Signature', '');

        if ($signatureHeader === '') {
            Log::warning('Stripe webhook: missing Stripe-Signature header');

            return new WebhookResult(
                handled: false,
                orderUlid: null,
                newStatus: null,
                meta: ['reason' => 'missing_signature_header'],
            );
        }

        // Parse `t=<ts>,v1=<sig>` — there may be multiple v1 entries; take the first.
        $timestamp = $this->extractTimestamp($signatureHeader);
        $receivedSignature = $this->extractV1Signature($signatureHeader);

        if ($timestamp === null || $receivedSignature === '') {
            Log::warning('Stripe webhook: malformed Stripe-Signature header');

            return new WebhookResult(
                handled: false,
                orderUlid: null,
                newStatus: null,
                meta: ['reason' => 'malformed_signature_header'],
            );
        }

        // Replay protection — reject stale timestamps (§10.3).
        if (abs(time() - $timestamp) > self::WEBHOOK_TOLERANCE_SECONDS) {
            Log::warning('Stripe webhook: stale timestamp rejected', [
                'timestamp' => $timestamp,
                'now' => time(),
                'diff_seconds' => abs(time() - $timestamp),
            ]);

            return new WebhookResult(
                handled: false,
                orderUlid: null,
                newStatus: null,
                meta: ['reason' => 'stale_timestamp'],
            );
        }

        // Verify HMAC-SHA256 signature.
        $signedPayload = $timestamp.'.'.$rawBody;
        $expected = hash_hmac(
            'sha256',
            $signedPayload,
            (string) config('commerce.payments.stripe.webhook_secret')
        );

        if (! hash_equals($expected, $receivedSignature)) {
            Log::warning('Stripe webhook: invalid signature');

            return new WebhookResult(
                handled: false,
                orderUlid: null,
                newStatus: null,
                meta: ['reason' => 'invalid_signature'],
            );
        }

        // Parse the event body — safe to decode only after signature verification.
        /** @var array<string, mixed> $event */
        $event = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);

        $eventType = (string) ($event['type'] ?? '');
        $eventId = (string) ($event['id'] ?? '');

        if ($eventType !== 'payment_intent.succeeded') {
            return WebhookResult::ignored();
        }

        /** @var array<string, mixed> $dataObject */
        $dataObject = $event['data']['object'] ?? [];

        $orderUlid = (string) ($dataObject['metadata']['order_ulid'] ?? '');
        $intentId = (string) ($dataObject['id'] ?? '');
        $amount = isset($dataObject['amount']) ? (int) $dataObject['amount'] : null;
        $currency = (string) ($dataObject['currency'] ?? '');

        return new WebhookResult(
            handled: true,
            orderUlid: $orderUlid !== '' ? $orderUlid : null,
            newStatus: PaymentStatus::Paid,
            meta: [
                'event_id' => $eventId,
                'payment_intent' => $intentId,
                'amount' => $amount,
                'currency' => $currency,
            ],
        );
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    /**
     * Extract the timestamp value from a Stripe-Signature header.
     *
     * Header format: `t=1234567890,v1=abc123,...`
     */
    private function extractTimestamp(string $header): ?int
    {
        if (preg_match('/(?:^|,)t=(\d+)(?:,|$)/', $header, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    /**
     * Extract the first v1 signature from a Stripe-Signature header.
     *
     * Header format: `t=1234567890,v1=abc123,...`
     */
    private function extractV1Signature(string $header): string
    {
        if (preg_match('/(?:^|,)v1=([a-f0-9]+)(?:,|$)/', $header, $matches)) {
            return $matches[1];
        }

        return '';
    }
}
