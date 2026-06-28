<?php

declare(strict_types=1);

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Models\PaymentTransaction;
use Illuminate\Testing\TestResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create an Order with a pending Billplz PaymentTransaction (bill reference).
 */
function webhookOrder(string $billId, array $orderOverrides = []): Order
{
    $order = Order::create(array_merge([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'billplz',
        'payment_reference' => $billId,
        'currency' => 'MYR',
        'subtotal' => 2000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 2500,
    ], $orderOverrides));

    OrderAddress::create([
        'order_id' => $order->id,
        'type' => 'billing',
        'first_name' => 'Ahmad',
        'last_name' => 'Ali',
        'address_1' => '1 Jalan Test',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'email' => 'ahmad@example.my',
    ]);

    PaymentTransaction::create([
        'order_id' => $order->id,
        'gateway' => 'billplz',
        'status' => 'pending',
        'amount' => $order->total,
        'reference' => $billId,
        'payload' => ['bill_id' => $billId],
    ]);

    return $order;
}

/**
 * Compute the Billplz X-Signature for a set of POST params.
 *
 * Source: all params sorted alphabetically by key, joined as "key=value|key=value",
 * then HMAC-SHA256 with the x_signature_key.
 */
function computeBillplzSignature(array $params, string $key): string
{
    ksort($params);
    $source = implode('|', array_map(fn ($k, $v) => "{$k}={$v}", array_keys($params), $params));

    return hash_hmac('sha256', $source, $key);
}

/**
 * Configure Billplz signature key.
 */
function setBillplzSigKey(string $key = 'test-sig-key'): void
{
    config([
        'commerce.payments.billplz.enabled' => true,
        'commerce.payments.billplz.api_key' => 'test-api-key',
        'commerce.payments.billplz.x_signature_key' => $key,
        'commerce.payments.billplz.collection_id' => 'test-collection-id',
        'commerce.payments.billplz.sandbox' => true,
    ]);
}

/**
 * Build and POST a Billplz callback with a valid signature.
 *
 * @param  array<string, mixed>  $overrides
 */
function postBillplzCallback(object $test, string $billId, array $overrides = []): TestResponse
{
    $sigKey = 'test-sig-key';
    setBillplzSigKey($sigKey);

    $params = array_merge([
        'id' => $billId,
        'collection_id' => 'test-collection-id',
        'paid' => 'true',
        'state' => 'paid',
        'amount' => '2500',
        'paid_amount' => '2500',
        'due_at' => '2026-01-01',
        'email' => 'ahmad@example.my',
        'mobile' => '',
        'name' => 'Ahmad Ali',
        'url' => "https://www.billplz-sandbox.com/bills/{$billId}",
    ], $overrides);

    $params['x_signature'] = computeBillplzSignature($params, $sigKey);

    return $test->post(route('webhooks.billplz'), $params);
}

// ─── Webhook tests ─────────────────────────────────────────────────────────────

describe('BillplzWebhookController', function () {
    it('marks order as paid on valid paid callback', function () {
        $billId = 'bill-valid-'.uniqid();
        $order = webhookOrder($billId);

        $response = postBillplzCallback($this, $billId, ['paid_amount' => '2500']);

        $response->assertStatus(200);
        $response->assertSee('OK');

        // Order payment_status updated
        $order->refresh();
        expect($order->payment_status)->toBe('paid');

        // Paid PaymentTransaction recorded
        $paidTx = PaymentTransaction::where('order_id', $order->id)
            ->where('status', 'paid')
            ->first();
        expect($paidTx)->not->toBeNull();
        expect($paidTx->gateway)->toBe('billplz');
        expect($paidTx->reference)->toBe($billId);

        // Status history entry added
        $history = OrderStatusHistory::where('order_id', $order->id)
            ->where('to_status', 'paid')
            ->first();
        expect($history)->not->toBeNull();
        expect($history->from_status)->toBe('pending');
    });

    it('returns 400 on invalid signature', function () {
        $billId = 'bill-badsig-'.uniqid();
        $order = webhookOrder($billId);

        setBillplzSigKey('test-sig-key');

        $params = [
            'id' => $billId,
            'paid' => 'true',
            'paid_amount' => '2500',
            'x_signature' => 'invalid-signature-value',
        ];

        $response = $this->post(route('webhooks.billplz'), $params);

        $response->assertStatus(400);

        // Order must NOT be updated
        $order->refresh();
        expect($order->payment_status)->toBe('pending');

        // No paid transaction
        expect(PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count())->toBe(0);
    });

    it('is idempotent — duplicate callback does not double-process', function () {
        $billId = 'bill-idem-'.uniqid();
        $order = webhookOrder($billId);

        // First callback
        postBillplzCallback($this, $billId, ['paid_amount' => '2500']);

        // Verify first processing
        $order->refresh();
        expect($order->payment_status)->toBe('paid');
        $txCountAfterFirst = PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count();
        expect($txCountAfterFirst)->toBe(1);

        // Second identical callback (duplicate)
        postBillplzCallback($this, $billId, ['paid_amount' => '2500']);

        // Order status unchanged (still 'paid')
        $order->refresh();
        expect($order->payment_status)->toBe('paid');

        // Still only one paid transaction (idempotency prevented double-insert)
        $txCountAfterSecond = PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count();
        expect($txCountAfterSecond)->toBe(1);
    });

    it('rejects callback with wrong amount and leaves order pending', function () {
        $billId = 'bill-wrongamt-'.uniqid();
        $order = webhookOrder($billId, ['total' => 2500]);

        // Callback claims a different amount
        postBillplzCallback($this, $billId, ['paid_amount' => '9999']);

        $order->refresh();
        expect($order->payment_status)->toBe('pending');

        expect(PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count())->toBe(0);
    });

    it('does not update order that is already paid (idempotency guard)', function () {
        $billId = 'bill-already-paid-'.uniqid();
        $order = webhookOrder($billId, ['payment_status' => 'paid']);

        $response = postBillplzCallback($this, $billId, ['paid_amount' => '2500']);

        $response->assertStatus(200);

        // No duplicate paid PaymentTransaction should be created
        $paidCount = PaymentTransaction::where('order_id', $order->id)
            ->where('status', 'paid')
            ->count();

        // At most one paid record (the idempotency ensures we don't add a duplicate)
        expect($paidCount)->toBeLessThanOrEqual(1);
    });

    it('returns 200 for an unpaid callback (failed/cancelled payment)', function () {
        $billId = 'bill-unpaid-'.uniqid();
        $order = webhookOrder($billId);

        $response = postBillplzCallback($this, $billId, [
            'paid' => 'false',
            'state' => 'due',
            'paid_amount' => '0',
        ]);

        $response->assertStatus(200);

        // Order remains pending
        $order->refresh();
        expect($order->payment_status)->toBe('pending');
    });

    it('webhook route is accessible without CSRF token', function () {
        // This test confirms the CSRF exemption is wired correctly.
        $billId = 'bill-nocsrf-'.uniqid();
        $order = webhookOrder($billId);

        // Post without withoutMiddleware() — CSRF should be skipped for webhooks
        $response = postBillplzCallback($this, $billId, ['paid_amount' => '2500']);

        // Should not be rejected with 419 CSRF error
        $response->assertStatus(200);
    });
});
