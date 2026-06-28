<?php

declare(strict_types=1);

namespace App\Domain\Orders\Services;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Inventory\Services\InventoryService;
use App\Domain\Orders\Events\OrderRefunded;
use App\Domain\Orders\Exceptions\RefundException;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\Services\PaymentGatewayManager;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Shared\Idempotency\IdempotencyService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Domain service for processing order refunds (CLAUDE.md §10.5).
 *
 * Responsibilities:
 *  - Validate refundable balance (amount > 0, amount ≤ refundable balance).
 *  - Wrap execution in IdempotencyService so duplicate submits are safe.
 *  - For gateways that support online refunds (Stripe, Billplz): call
 *    $gateway->refund() — the gateway itself creates the PaymentTransaction
 *    row as part of its implementation, maintaining a clean audit trail.
 *  - For gateways that do NOT support online refunds (COD, unknown): record
 *    a manual/offline PaymentTransaction row in the service layer.
 *  - Update order.amount_refunded and payment_status in one DB transaction.
 *  - Record an OrderStatusHistory note for the audit trail.
 *  - Optionally restock items via InventoryService when restock = true.
 *  - Dispatch OrderRefunded event AFTER everything commits.
 *
 * Design note on transaction ownership:
 *   Online-refund gateways (Stripe/Billplz) create their own PaymentTransaction
 *   row inside refund() — this is intentional and was established in Phase B4.
 *   The service delegates transaction creation to the gateway for online paths
 *   and creates it itself only for offline/manual paths. In both cases the
 *   service owns the order-state mutation (amount_refunded, payment_status,
 *   status history) inside DB::transaction().
 *
 * Constraints from CLAUDE.md:
 *  - Email failure must not roll back a completed refund — no mail here.
 *  - Never trust browser-supplied amounts (amounts are validated server-side).
 *  - All money in integer minor units.
 *  - DB::transaction() owns the order + history write boundary.
 *  - IdempotencyService owns replay protection.
 */
class RefundService
{
    public function __construct(
        private readonly PaymentGatewayManager $gatewayManager,
        private readonly IdempotencyService $idempotency,
        private readonly InventoryService $inventoryService,
    ) {}

    /**
     * Process a refund for the given order.
     *
     * @param  int  $amountMinor  Refund amount in minor units (e.g. cents).
     * @param  string  $reason  Admin-supplied reason for the audit trail.
     * @param  ?int  $actorId  User ID performing the refund (Auth::id() fallback).
     * @param  string  $idempotencyKey  Client-supplied key — repeating the call is safe.
     * @param  bool  $restock  When true, restock order items via InventoryService.
     * @return PaymentTransaction The refund transaction record (gateway-created or service-created).
     *
     * @throws RefundException When the amount is invalid, exceeds the refundable balance,
     *                         or the gateway rejects the refund.
     */
    public function refund(
        Order $order,
        int $amountMinor,
        string $reason,
        ?int $actorId,
        string $idempotencyKey,
        bool $restock = false,
    ): PaymentTransaction {
        // ── 1. Domain validation before touching any state ────────────────────
        if ($amountMinor <= 0) {
            throw new RefundException('Refund amount must be greater than zero.');
        }

        $refundableBalance = $order->total - $order->amount_refunded;

        if ($amountMinor > $refundableBalance) {
            throw new RefundException(
                "Refund amount ({$amountMinor}) exceeds the refundable balance ({$refundableBalance})."
            );
        }

        $actor = $actorId ?? Auth::id();
        $currency = (string) $order->currency;
        $money = Money::of($amountMinor, $currency);

        // ── 2. Idempotency wrap — ensures repeated calls do not double-refund ─
        $result = $this->idempotency->remember(
            scope: 'refund',
            key: $idempotencyKey,
            payload: [
                'order_ulid' => $order->ulid,
                'amount_minor' => $amountMinor,
            ],
            work: fn (): array => $this->executeRefund($order, $amountMinor, $money, $reason, $actor, $restock),
        );

        $transactionId = (int) ($result['transaction_id'] ?? 0);
        $transaction = PaymentTransaction::findOrFail($transactionId);

        // ── 3. Dispatch event post-commit ──────────────────────────────────────
        // idempotency->remember() runs $work and commits before we reach here, so
        // this dispatch is always post-commit (CLAUDE.md §4.3). On a replay the
        // event is NOT re-dispatched — the idempotency layer short-circuits $work.
        if (! empty($result['_dispatched'])) {
            $order->refresh();
            event(new OrderRefunded($order, $money));
        }

        return $transaction;
    }

    /**
     * Core refund execution — runs inside the idempotency closure.
     *
     * @return array<string, mixed>
     */
    private function executeRefund(
        Order $order,
        int $amountMinor,
        Money $money,
        string $reason,
        ?int $actor,
        bool $restock,
    ): array {
        $gatewayName = (string) ($order->payment_method ?? '');

        // ── 2a. Attempt the external gateway refund or record offline ──────────
        $refundTransaction = null;

        $usesOnlineGateway = $this->gatewayManager->has($gatewayName)
            && $this->gatewayManager->get($gatewayName)->supports('refund');

        if ($usesOnlineGateway) {
            // Online path: the gateway creates its own PaymentTransaction row
            // as part of refund(). On failure it throws PaymentException —
            // we catch and wrap so idempotency releases the claim for retry.
            $gateway = $this->gatewayManager->get($gatewayName);

            try {
                $gateway->refund($order, $money, ['reason' => $reason]);
            } catch (PaymentException $e) {
                throw new RefundException(
                    "Gateway refund failed: {$e->getMessage()}",
                    previous: $e,
                );
            }

            // Retrieve the transaction row the gateway just inserted (latest for this order).
            $refundTransaction = PaymentTransaction::where('order_id', $order->id)
                ->where('gateway', $gatewayName)
                ->where('status', 'refunded')
                ->latest('id')
                ->firstOrFail();
        } else {
            // Offline/manual path: service creates the transaction record.
            $refundTransaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'gateway' => $gatewayName !== '' ? $gatewayName : 'manual',
                'status' => 'refunded',
                'amount' => $amountMinor,
                'reference' => null,
                'payload' => [
                    'type' => 'refund',
                    'offline' => true,
                    'reason' => $reason,
                    'initiated_by' => $actor,
                ],
            ]);
        }

        // ── 2b. Mutate order state inside a DB transaction ─────────────────────
        DB::transaction(function () use ($order, $amountMinor, $reason, $actor, $restock, $usesOnlineGateway): void {
            // Re-read amount_refunded with a row lock to guard against concurrent refunds.
            $fresh = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            $newAmountRefunded = $fresh->amount_refunded + $amountMinor;

            $newPaymentStatus = $newAmountRefunded >= $fresh->total
                ? 'refunded'
                : 'partially_refunded';

            $fresh->update([
                'amount_refunded' => $newAmountRefunded,
                'payment_status' => $newPaymentStatus,
            ]);

            // Promote order status when fully refunded.
            if ($newPaymentStatus === 'refunded' && $fresh->status !== 'refunded') {
                $oldStatus = $fresh->status;
                $fresh->update(['status' => 'refunded']);

                OrderStatusHistory::create([
                    'order_id' => $fresh->id,
                    'from_status' => $oldStatus,
                    'to_status' => 'refunded',
                    'note' => null,
                    'is_customer_note' => false,
                    'created_by' => $actor,
                ]);
            }

            // Audit note.
            $formattedAmount = number_format($amountMinor / 100, 2);
            $noteText = "Refunded {$fresh->currency} {$formattedAmount}";
            if ($reason !== '') {
                $noteText .= ": {$reason}";
            }
            if (! $usesOnlineGateway) {
                $noteText .= ' (offline/manual refund)';
            }

            OrderStatusHistory::create([
                'order_id' => $fresh->id,
                'from_status' => null,
                'to_status' => $fresh->status,
                'note' => $noteText,
                'is_customer_note' => false,
                'created_by' => $actor,
            ]);

            // Optional restock (CLAUDE.md §9.5: only when explicitly chosen).
            if ($restock) {
                foreach ($order->items()->with(['product', 'variation'])->get() as $item) {
                    $product = $item->product;

                    // instanceof narrows the type for PHPStan from Model to Product.
                    if (! ($product instanceof Product) || ! $product->manage_stock) {
                        continue;
                    }

                    $variation = $item->variation instanceof ProductVariation ? $item->variation : null;

                    $this->inventoryService->restore(
                        product: $product,
                        quantity: $item->quantity,
                        variation: $variation,
                        referenceType: Order::class,
                        referenceId: $order->id,
                    );
                }
            }
        });

        // Sync the in-memory model so the caller sees updated values.
        $order->refresh();

        return [
            'transaction_id' => $refundTransaction->id,
            '_dispatched' => true,
        ];
    }
}
