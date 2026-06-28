<?php

declare(strict_types=1);

namespace App\Domain\Payments\Gateways;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Billplz FPX payment gateway — Malaysian online banking (redirect flow).
 *
 * Flow:
 *  1. createPayment() POSTs to the Billplz API to create a Bill and returns
 *     PaymentResult::redirect() with the hosted payment URL. The order status
 *     stays 'pending' until Billplz sends a server-to-server callback.
 *  2. Billplz POSTs a callback to /webhooks/billplz (BillplzWebhookController).
 *     handleWebhook() verifies the X-Signature and returns a WebhookResult.
 *     The controller then updates order/transaction state.
 *  3. Billplz also redirects the browser to the returnUrl after payment.
 *     The browser redirect is NOT used to mark an order as paid (§10.3).
 *
 * Capabilities:
 *   - supports('redirect')  → true
 *   - supports('webhook')   → true
 *   - supports('refund')    → true
 *
 * Secrets: api_key and x_signature_key are loaded from config only. They are
 * never logged, returned to the browser, or included in Inertia props (§10.4).
 *
 * Disabled by default (BILLPLZ_ENABLED=false). Enable only after sandbox
 * credentials are verified and the webhook signature has been tested (§16.3).
 */
class BillplzGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'billplz';
    }

    public function label(): string
    {
        return 'Billplz (FPX Online Banking)';
    }

    public function isEnabled(): bool
    {
        if (! (bool) config('commerce.payments.billplz.enabled', false)) {
            return false;
        }

        // All three credentials must be present for the gateway to function.
        return ! empty(config('commerce.payments.billplz.api_key'))
            && ! empty(config('commerce.payments.billplz.x_signature_key'))
            && ! empty(config('commerce.payments.billplz.collection_id'));
    }

    public function supports(string $capability): bool
    {
        return in_array($capability, ['redirect', 'webhook', 'refund'], true);
    }

    /**
     * Create a Billplz Bill and return a redirect PaymentResult.
     *
     * MUST be called AFTER the order-placement transaction commits (§10 / §4.3).
     * Makes an external HTTP request — never call inside DB::transaction().
     *
     * @throws PaymentException when the Billplz API rejects the request
     */
    public function createPayment(Order $order, PaymentAttemptData $attempt): PaymentResult
    {
        $baseUrl = $this->baseUrl();
        /** @var OrderAddress|null $billingAddress */
        $billingAddress = $order->billingAddress()->first();

        $name = $billingAddress !== null
            ? trim("{$billingAddress->first_name} {$billingAddress->last_name}")
            : 'Customer';

        $email = $billingAddress !== null ? ($billingAddress->email ?? '') : '';

        $response = Http::withBasicAuth((string) config('commerce.payments.billplz.api_key'), '')
            ->asForm()
            ->post("{$baseUrl}/bills", [
                'collection_id' => config('commerce.payments.billplz.collection_id'),
                'paid_amount' => 'false',
                'amount' => $order->total,
                'currency' => $order->currency,
                'name' => $name ?: 'Customer',
                'email' => $email,
                'callback_url' => route('webhooks.billplz'),
                'redirect_url' => $attempt->returnUrl,
                'description' => "Order #{$order->order_number}",
            ]);

        if ($response->failed()) {
            Log::warning('Billplz bill creation failed', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $response->status(),
                // Never log the full response body — it may contain credentials or PII
                'error_code' => $response->json('error.code') ?? 'unknown',
            ]);

            throw new PaymentException(
                "Billplz bill creation failed (HTTP {$response->status()}). Please try again."
            );
        }

        $bill = $response->json();
        $billId = (string) ($bill['id'] ?? '');
        $billUrl = (string) ($bill['url'] ?? '');

        // Record a pending PaymentTransaction immediately so there is an audit trail
        // even if the customer abandons the Billplz payment page.
        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => $this->name(),
            'status' => 'pending',
            'amount' => $order->total,
            'reference' => $billId ?: null,
            'payload' => [
                // Sanitised subset — never include API keys or customer PII
                'bill_id' => $billId,
                'collection_id' => $bill['collection_id'] ?? null,
                'currency' => $bill['currency'] ?? null,
                'idempotency_key' => $attempt->idempotencyKey,
            ],
        ]);

        return PaymentResult::redirect($billUrl, $billId ?: null);
    }

    /**
     * Refund a Billplz bill.
     *
     * @throws PaymentException on refund failure
     */
    public function refund(Order $order, Money $amount, array $context): RefundResult
    {
        $baseUrl = $this->baseUrl();
        $reference = $order->payment_reference;

        if ($reference === null || $reference === '') {
            throw new PaymentException('Cannot refund: order has no payment reference (Billplz bill ID).');
        }

        $response = Http::withBasicAuth((string) config('commerce.payments.billplz.api_key'), '')
            ->asForm()
            ->post("{$baseUrl}/bills/{$reference}/refund");

        if ($response->failed()) {
            Log::warning('Billplz refund failed', [
                'order_id' => $order->id,
                'reference' => $reference,
                'status' => $response->status(),
            ]);

            throw new PaymentException(
                "Billplz refund failed (HTTP {$response->status()})."
            );
        }

        $refundData = $response->json();
        $refundId = (string) ($refundData['id'] ?? '');

        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => $this->name(),
            'status' => 'refunded',
            'amount' => $amount->minor,
            'reference' => $refundId ?: null,
            'payload' => [
                'type' => 'refund',
                'original_bill_id' => $reference,
                'refund_id' => $refundId,
            ],
        ]);

        return new RefundResult(
            success: true,
            reference: $refundId ?: null,
            meta: ['bill_id' => $reference],
        );
    }

    /**
     * Verify a Billplz server-to-server callback and return a WebhookResult.
     *
     * Verification follows §10.3:
     *  1. Extract x_signature from POST params.
     *  2. Build HMAC source: all POST params EXCEPT x_signature, sorted
     *     alphabetically by key, joined as "key=value|key=value".
     *  3. HMAC-SHA256 with x_signature_key.
     *  4. Compare with hash_equals to prevent timing attacks.
     *  5. Only parse/act on the event after signature is confirmed valid.
     *
     * The controller is responsible for state mutations after this method returns.
     *
     * @throws UnsupportedCapabilityException never (this gateway supports webhooks)
     */
    public function handleWebhook(Request $request): WebhookResult
    {
        /** @var array<string, mixed> $params */
        $params = (array) $request->post();

        $receivedSignature = (string) ($params['x_signature'] ?? '');
        unset($params['x_signature']);

        $expected = $this->computeSignature($params);

        if (! hash_equals($expected, $receivedSignature)) {
            Log::warning('Billplz webhook: invalid X-Signature', [
                'bill_id' => $params['id'] ?? 'unknown',
            ]);

            return new WebhookResult(
                handled: false,
                orderUlid: null,
                newStatus: null,
                meta: ['reason' => 'invalid_signature'],
            );
        }

        $billId = (string) ($params['id'] ?? '');
        $paid = filter_var($params['paid'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $paidAmount = isset($params['paid_amount']) ? (int) $params['paid_amount'] : null;

        // Look up the order via the matching PaymentTransaction reference.
        $transaction = PaymentTransaction::where('reference', $billId)
            ->where('gateway', $this->name())
            ->latest('id')
            ->first();

        /** @var Order|null $relatedOrder */
        $relatedOrder = $transaction?->order;
        $orderUlid = $relatedOrder?->ulid;

        $newStatus = $paid ? PaymentStatus::Paid : PaymentStatus::Failed;

        return new WebhookResult(
            handled: true,
            orderUlid: $orderUlid,
            newStatus: $newStatus,
            meta: [
                'bill_id' => $billId,
                'paid' => $paid,
                'paid_amount' => $paidAmount,
            ],
        );
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private function baseUrl(): string
    {
        $sandbox = (bool) config('commerce.payments.billplz.sandbox', true);

        return $sandbox
            ? 'https://www.billplz-sandbox.com/api/v3'
            : 'https://www.billplz.com/api/v3';
    }

    /**
     * Compute the HMAC-SHA256 X-Signature for the given POST parameters.
     *
     * Source format: sort params by key, join as "key=value|key=value".
     *
     * @param  array<string, mixed>  $params  All POST params except x_signature
     */
    public function computeSignature(array $params): string
    {
        ksort($params);

        $source = implode(
            '|',
            array_map(
                fn (string $k, mixed $v) => "{$k}={$v}",
                array_keys($params),
                $params,
            )
        );

        return hash_hmac('sha256', $source, (string) config('commerce.payments.billplz.x_signature_key'));
    }
}
