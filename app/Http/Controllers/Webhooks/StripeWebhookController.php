<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Gateways\StripeGateway;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Shared\Idempotency\IdempotencyConflictException;
use App\Domain\Shared\Idempotency\IdempotencyService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles Stripe server-to-server webhook events (§10.3).
 *
 * Processing order (CLAUDE.md §10.3):
 *  1. Read the raw request body via Request (required for signature verification).
 *  2. Delegate to StripeGateway::handleWebhook() for signature verification
 *     and event parsing. No state mutations before this step.
 *  3. If signature is invalid or event is not handled: return 400/200 appropriately.
 *  4. Claim the event idempotently via IdempotencyService using the Stripe event
 *     ID as the key. Duplicate events return 200 without re-processing.
 *  5. Locate the Order by ULID (from metadata) or fall back to the pending
 *     PaymentTransaction whose reference matches the payment_intent ID.
 *  6. Verify amount and currency match the order. Reject mismatches.
 *  7. If paid and order not already paid: DB::transaction to update
 *     payment_status, record a paid PaymentTransaction, and add an
 *     OrderStatusHistory entry.
 *  8. Return 200 quickly — heavy follow-up work (email, fulfilment) should
 *     be queued in listeners after commit.
 *
 * Security: this route is CSRF-exempt (bootstrap/app.php) because Stripe sends
 * server-to-server callbacks without a CSRF token. Stripe-Signature HMAC
 * verification is the primary security mechanism (§10.3).
 */
class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StripeGateway $gateway,
        private readonly IdempotencyService $idempotencyService,
    ) {}

    public function handle(Request $request): Response
    {
        // ── Step 2: Verify signature and parse event ─────────────────────────
        $webhookResult = $this->gateway->handleWebhook($request);

        if (! $webhookResult->handled) {
            // WebhookResult::ignored() has an empty meta array (no 'reason').
            // Authentication / signature failures set a 'reason' key in meta.
            // Ignored event types (not relevant to our domain) return 200 so
            // Stripe does not retry them. Authentication failures return 400.
            if (isset($webhookResult->meta['reason'])) {
                return response('Webhook not accepted', 400);
            }

            return response('OK', 200);
        }

        $meta = $webhookResult->meta;
        $eventId = (string) ($meta['event_id'] ?? '');
        $paymentIntentId = (string) ($meta['payment_intent'] ?? '');
        $amount = isset($meta['amount']) ? (int) $meta['amount'] : null;
        $currency = (string) ($meta['currency'] ?? '');
        $orderUlid = $webhookResult->orderUlid;

        if ($eventId === '') {
            Log::warning('Stripe webhook: missing event_id in verified callback');

            return response('Missing event ID', 400);
        }

        // ── Step 4: Idempotency — claim the event once ───────────────────────
        try {
            $this->idempotencyService->remember(
                scope: 'stripe_webhook',
                key: $eventId,
                payload: ['event_id' => $eventId, 'payment_intent' => $paymentIntentId],
                work: function () use ($orderUlid, $paymentIntentId, $amount, $currency, $eventId): array {
                    // ── Step 5: Locate the order ─────────────────────────────
                    // Primary: look up by ULID from the PaymentIntent metadata.
                    // Fallback: find the pending PaymentTransaction whose
                    // reference matches the PaymentIntent ID.
                    $order = null;

                    if ($orderUlid !== null && $orderUlid !== '') {
                        $order = Order::where('ulid', $orderUlid)->first();
                    }

                    if ($order === null && $paymentIntentId !== '') {
                        $transaction = PaymentTransaction::where('reference', $paymentIntentId)
                            ->where('gateway', 'stripe')
                            ->latest('id')
                            ->first();

                        if ($transaction !== null) {
                            $order = Order::find($transaction->order_id);
                        }
                    }

                    if ($order === null) {
                        Log::warning('Stripe webhook: order not found', [
                            'order_ulid' => $orderUlid,
                            'payment_intent' => $paymentIntentId,
                            'event_id' => $eventId,
                        ]);

                        return ['processed' => false, 'reason' => 'order_not_found'];
                    }

                    // ── Step 6: Verify amount and currency ───────────────────
                    if ($amount !== null && $amount !== $order->total) {
                        Log::warning('Stripe webhook: amount mismatch', [
                            'order_id' => $order->id,
                            'expected' => $order->total,
                            'received' => $amount,
                            'event_id' => $eventId,
                        ]);

                        return ['processed' => false, 'reason' => 'amount_mismatch'];
                    }

                    if (
                        $currency !== ''
                        && strtolower($currency) !== strtolower((string) $order->currency)
                    ) {
                        Log::warning('Stripe webhook: currency mismatch', [
                            'order_id' => $order->id,
                            'expected' => $order->currency,
                            'received' => $currency,
                            'event_id' => $eventId,
                        ]);

                        return ['processed' => false, 'reason' => 'currency_mismatch'];
                    }

                    // ── Step 7: Update order state exactly once ──────────────
                    if ($order->payment_status !== 'paid') {
                        DB::transaction(function () use ($order, $paymentIntentId, $eventId): void {
                            $fromStatus = $order->payment_status;

                            $order->update(['payment_status' => PaymentStatus::Paid->value]);

                            PaymentTransaction::create([
                                'order_id' => $order->id,
                                'gateway' => 'stripe',
                                'status' => 'paid',
                                'amount' => $order->total,
                                'reference' => $paymentIntentId ?: null,
                                'payload' => [
                                    'type' => 'payment_confirmed',
                                    'payment_intent_id' => $paymentIntentId,
                                    'event_id' => $eventId,
                                    'source' => 'webhook',
                                ],
                            ]);

                            OrderStatusHistory::create([
                                'order_id' => $order->id,
                                'from_status' => $fromStatus,
                                'to_status' => PaymentStatus::Paid->value,
                                'note' => 'Payment confirmed via Stripe webhook.',
                                'is_customer_note' => false,
                                'created_by' => null,
                            ]);
                        });

                        Log::info('Stripe webhook: order marked paid', [
                            'order_id' => $order->id,
                            'payment_intent' => $paymentIntentId,
                        ]);
                    }

                    return ['processed' => true, 'order_id' => $order->id];
                },
            );
        } catch (IdempotencyConflictException) {
            // A concurrent duplicate is in flight — return 200 to avoid
            // Stripe retrying aggressively. The in-flight request will complete.
            return response('OK', 200);
        } catch (\Throwable $e) {
            Log::error('Stripe webhook processing failed', [
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);

            // Return 500 so Stripe retries (it will be caught by idempotency on retry).
            return response('Processing error', 500);
        }

        // ── Step 8: Return 200 quickly ───────────────────────────────────────
        return response('OK', 200);
    }
}
