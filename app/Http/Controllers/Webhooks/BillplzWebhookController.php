<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Gateways\BillplzGateway;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Shared\Idempotency\IdempotencyConflictException;
use App\Domain\Shared\Idempotency\IdempotencyService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles Billplz server-to-server payment callbacks (§10.3).
 *
 * Processing order (CLAUDE.md §10.3):
 *  1. Read raw POST body via Request.
 *  2. Delegate to BillplzGateway::handleWebhook() for signature verification
 *     and event parsing. No state mutations before this step.
 *  3. If signature is invalid: return 400. Log without PII.
 *  4. Claim the event idempotently via IdempotencyService using the bill ID
 *     as the key. Duplicate events return 200 without re-processing.
 *  5. Locate the Order via a PaymentTransaction where reference = bill_id.
 *  6. Verify amount and currency match the order. Reject mismatches.
 *  7. If paid and order not already paid: DB::transaction to update
 *     payment_status, record a paid PaymentTransaction, and add
 *     OrderStatusHistory entry.
 *  8. Return 200 quickly — heavy follow-up work (email, fulfilment) should
 *     be queued in listeners after commit.
 *
 * Security: this route is CSRF-exempt (bootstrap/app.php) because Billplz
 * sends server-to-server callbacks without a CSRF token. Signature
 * verification is the primary security mechanism (§10.3).
 */
class BillplzWebhookController extends Controller
{
    public function __construct(
        private readonly BillplzGateway $gateway,
        private readonly IdempotencyService $idempotencyService,
    ) {}

    public function handle(Request $request): Response
    {
        // ── Step 2: Verify signature and parse event ────────────────────────
        $webhookResult = $this->gateway->handleWebhook($request);

        if (! $webhookResult->handled) {
            return response('Invalid signature', 400);
        }

        $meta = $webhookResult->meta;
        $billId = (string) ($meta['bill_id'] ?? '');
        $paid = (bool) ($meta['paid'] ?? false);
        $paidAmount = isset($meta['paid_amount']) ? (int) $meta['paid_amount'] : null;
        $newStatus = $webhookResult->newStatus;

        if ($billId === '') {
            Log::warning('Billplz webhook: missing bill_id in verified callback');

            return response('Missing bill ID', 400);
        }

        // ── Step 4: Idempotency — claim the event once ──────────────────────
        try {
            $this->idempotencyService->remember(
                scope: 'billplz_webhook',
                key: $billId.':'.($paid ? 'paid' : 'unpaid'),
                payload: ['bill_id' => $billId, 'paid' => $paid],
                work: function () use ($billId, $paid, $paidAmount): array {
                    // ── Step 5: Locate the order ────────────────────────────
                    $transaction = PaymentTransaction::where('reference', $billId)
                        ->where('gateway', 'billplz')
                        ->latest('id')
                        ->first();

                    if ($transaction === null) {
                        Log::warning('Billplz webhook: no PaymentTransaction found', [
                            'bill_id' => $billId,
                        ]);

                        return ['processed' => false, 'reason' => 'transaction_not_found'];
                    }

                    /** @var Order|null $order */
                    $order = Order::find($transaction->order_id);

                    if ($order === null) {
                        Log::warning('Billplz webhook: order not found', [
                            'bill_id' => $billId,
                            'order_id' => $transaction->order_id,
                        ]);

                        return ['processed' => false, 'reason' => 'order_not_found'];
                    }

                    // ── Step 6: Verify amount ───────────────────────────────
                    // Billplz sends paid_amount in cents (minor units).
                    if ($paidAmount !== null && $paidAmount !== $order->total) {
                        Log::warning('Billplz webhook: amount mismatch', [
                            'bill_id' => $billId,
                            'order_id' => $order->id,
                            'expected' => $order->total,
                            'received' => $paidAmount,
                        ]);

                        return ['processed' => false, 'reason' => 'amount_mismatch'];
                    }

                    // ── Step 7: Update order state exactly once ─────────────
                    if ($paid && $order->payment_status !== 'paid') {
                        DB::transaction(function () use ($order, $billId): void {
                            $fromStatus = $order->payment_status;

                            $order->update(['payment_status' => PaymentStatus::Paid->value]);

                            PaymentTransaction::create([
                                'order_id' => $order->id,
                                'gateway' => 'billplz',
                                'status' => 'paid',
                                'amount' => $order->total,
                                'reference' => $billId,
                                'payload' => [
                                    'type' => 'payment_confirmed',
                                    'bill_id' => $billId,
                                    'source' => 'webhook',
                                ],
                            ]);

                            OrderStatusHistory::create([
                                'order_id' => $order->id,
                                'from_status' => $fromStatus,
                                'to_status' => PaymentStatus::Paid->value,
                                'note' => 'Payment confirmed via Billplz webhook.',
                                'is_customer_note' => false,
                                'created_by' => null,
                            ]);
                        });

                        Log::info('Billplz webhook: order marked paid', [
                            'order_id' => $order->id,
                            'bill_id' => $billId,
                        ]);
                    }

                    return ['processed' => true, 'order_id' => $order->id];
                },
            );
        } catch (IdempotencyConflictException) {
            // A concurrent duplicate is in flight — return 200 to avoid
            // Billplz retrying aggressively. The in-flight request will complete.
            return response('OK', 200);
        } catch (\Throwable $e) {
            Log::error('Billplz webhook processing failed', [
                'bill_id' => $billId,
                'error' => $e->getMessage(),
            ]);

            // Return 500 so Billplz retries (it will be caught by idempotency on retry).
            return response('Processing error', 500);
        }

        // ── Step 8: Return 200 quickly ──────────────────────────────────────
        return response('OK', 200);
    }
}
