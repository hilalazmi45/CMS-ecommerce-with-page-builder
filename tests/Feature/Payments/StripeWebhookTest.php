<?php

declare(strict_types=1);

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Models\PaymentTransaction;
use Illuminate\Testing\TestResponse;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create an Order with a pending Stripe PaymentTransaction (intent reference).
 *
 * @param  array<string, mixed>  $orderOverrides
 */
function stripeWebhookOrder(string $intentId, array $orderOverrides = []): Order
{
    $order = Order::create(array_merge([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'stripe',
        'payment_reference' => $intentId,
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
        'first_name' => 'Lim',
        'last_name' => 'Wei',
        'address_1' => '2 Jalan Test',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'email' => 'lim@example.my',
    ]);

    PaymentTransaction::create([
        'order_id' => $order->id,
        'gateway' => 'stripe',
        'status' => 'pending',
        'amount' => $order->total,
        'reference' => $intentId,
        'payload' => ['payment_intent_id' => $intentId],
    ]);

    return $order;
}

/**
 * Compute a valid Stripe-Signature header value.
 */
function stripeSignatureHeader(string $rawBody, string $webhookSecret, ?int $timestamp = null): string
{
    $ts = $timestamp ?? time();
    $sig = hash_hmac('sha256', $ts.'.'.$rawBody, $webhookSecret);

    return "t={$ts},v1={$sig}";
}

/**
 * Set Stripe config for webhook tests.
 */
function setStripeWebhookConfig(string $webhookSecret = 'whsec_test_secret'): void
{
    config([
        'commerce.payments.stripe.enabled' => true,
        'commerce.payments.stripe.public_key' => 'pk_test_abc',
        'commerce.payments.stripe.secret_key' => 'sk_test_abc',
        'commerce.payments.stripe.webhook_secret' => $webhookSecret,
    ]);
}

/**
 * Build and POST a Stripe payment_intent.succeeded webhook with a valid signature.
 *
 * @param  array<string, mixed>  $dataObjectOverrides  Overrides for the data.object fields
 */
function postStripeWebhook(
    object $test,
    string $intentId,
    string $orderUlid,
    array $dataObjectOverrides = [],
    string $eventId = '',
    string $eventType = 'payment_intent.succeeded',
    int $amount = 2500,
    string $currency = 'myr',
    ?int $timestamp = null,
    ?string $webhookSecret = null,
): TestResponse {
    $secret = $webhookSecret ?? 'whsec_test_secret';
    setStripeWebhookConfig($secret);

    $eventId = $eventId !== '' ? $eventId : 'evt_'.uniqid();

    $dataObject = array_merge([
        'id' => $intentId,
        'object' => 'payment_intent',
        'amount' => $amount,
        'currency' => $currency,
        'status' => 'succeeded',
        'metadata' => ['order_ulid' => $orderUlid],
    ], $dataObjectOverrides);

    $body = json_encode([
        'id' => $eventId,
        'type' => $eventType,
        'data' => ['object' => $dataObject],
    ]);

    $signature = stripeSignatureHeader($body, $secret, $timestamp);

    // Pass the Stripe-Signature header via the server vars array (HTTP_* prefix)
    // so that $request->header('Stripe-Signature') resolves it correctly in the
    // test environment, and pass the raw body as the 7th arg so getContent()
    // returns the exact bytes used to compute the HMAC.
    return $test->call('POST', route('webhooks.stripe'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_STRIPE_SIGNATURE' => $signature,
    ], $body);
}

// ─── Webhook tests ─────────────────────────────────────────────────────────────

describe('StripeWebhookController', function () {

    // ── Happy path ─────────────────────────────────────────────────────────────

    it('marks order as paid on valid payment_intent.succeeded event', function () {
        $intentId = 'pi_test_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $response = postStripeWebhook($this, $intentId, $order->ulid);

        $response->assertStatus(200);

        $order->refresh();
        expect($order->payment_status)->toBe('paid');
    });

    it('records a paid PaymentTransaction after successful webhook', function () {
        $intentId = 'pi_test_txn_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $eventId = 'evt_txn_'.uniqid();
        postStripeWebhook($this, $intentId, $order->ulid, eventId: $eventId);

        $paidTx = PaymentTransaction::where('order_id', $order->id)
            ->where('status', 'paid')
            ->first();

        expect($paidTx)->not->toBeNull();
        expect($paidTx->gateway)->toBe('stripe');
        expect($paidTx->amount)->toBe(2500);
        expect($paidTx->reference)->toBe($intentId);
        expect($paidTx->payload['event_id'])->toBe($eventId);
    });

    it('creates an OrderStatusHistory entry when order is marked paid', function () {
        $intentId = 'pi_test_hist_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        postStripeWebhook($this, $intentId, $order->ulid);

        $history = OrderStatusHistory::where('order_id', $order->id)->latest('id')->first();
        expect($history)->not->toBeNull();
        expect($history->to_status)->toBe('paid');
        expect($history->from_status)->toBe('pending');
    });

    // ── Signature / security ───────────────────────────────────────────────────

    it('returns 400 when Stripe-Signature header is missing', function () {
        setStripeWebhookConfig();
        $body = json_encode(['id' => 'evt_nosig', 'type' => 'payment_intent.succeeded', 'data' => ['object' => []]]);

        $response = $this->call('POST', route('webhooks.stripe'), [], [], [], ['CONTENT_TYPE' => 'application/json'], $body);

        $response->assertStatus(400);
    });

    it('returns 400 when Stripe-Signature HMAC is invalid', function () {
        setStripeWebhookConfig();
        $intentId = 'pi_badsig_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $body = json_encode(['id' => 'evt_bad', 'type' => 'payment_intent.succeeded', 'data' => ['object' => ['metadata' => ['order_ulid' => $order->ulid]]]]);

        $response = $this->call('POST', route('webhooks.stripe'), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.time().',v1=invalidsig',
        ], $body);

        $response->assertStatus(400);

        $order->refresh();
        expect($order->payment_status)->toBe('pending'); // unchanged
    });

    it('returns 400 when timestamp is stale (older than 300 s)', function () {
        setStripeWebhookConfig();
        $intentId = 'pi_stale_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $staleTs = time() - 400;
        $response = postStripeWebhook($this, $intentId, $order->ulid, timestamp: $staleTs);

        $response->assertStatus(400);

        $order->refresh();
        expect($order->payment_status)->toBe('pending');
    });

    // ── Idempotency ─────────────────────────────────────────────────────────────

    it('processes duplicate event ID only once (idempotency)', function () {
        $intentId = 'pi_dedup_'.uniqid();
        $order = stripeWebhookOrder($intentId);
        $eventId = 'evt_dedup_'.uniqid();

        postStripeWebhook($this, $intentId, $order->ulid, eventId: $eventId)->assertStatus(200);
        postStripeWebhook($this, $intentId, $order->ulid, eventId: $eventId)->assertStatus(200);

        // Exactly one paid PaymentTransaction
        $count = PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count();
        expect($count)->toBe(1);

        // Exactly one status history entry
        $historyCount = OrderStatusHistory::where('order_id', $order->id)->count();
        expect($historyCount)->toBe(1);
    });

    // ── Amount / currency verification ─────────────────────────────────────────

    it('rejects event when amount does not match the order total', function () {
        $intentId = 'pi_amtmm_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $response = postStripeWebhook(
            $this,
            $intentId,
            $order->ulid,
            dataObjectOverrides: ['amount' => 9999], // wrong amount
            amount: 9999,
        );

        $response->assertStatus(200); // we still return 200 (Stripe doesn't need to retry)

        $order->refresh();
        expect($order->payment_status)->toBe('pending'); // unchanged
    });

    it('rejects event when currency does not match the order currency', function () {
        $intentId = 'pi_curmm_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        $response = postStripeWebhook(
            $this,
            $intentId,
            $order->ulid,
            dataObjectOverrides: ['currency' => 'usd'],
            currency: 'usd',
        );

        $response->assertStatus(200);

        $order->refresh();
        expect($order->payment_status)->toBe('pending');
    });

    // ── Ignored event types ────────────────────────────────────────────────────

    it('returns 200 and makes no state changes for ignored event types', function () {
        setStripeWebhookConfig();
        $body = json_encode([
            'id' => 'evt_ignore_'.uniqid(),
            'type' => 'customer.subscription.created',
            'data' => ['object' => []],
        ]);
        $sig = stripeSignatureHeader($body, 'whsec_test_secret');

        $response = $this->call('POST', route('webhooks.stripe'), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $sig,
        ], $body);

        $response->assertStatus(200);

        expect(PaymentTransaction::count())->toBe(0);
    });

    // ── Order already paid (idempotent guard) ───────────────────────────────────

    it('does not double-process when the order is already paid', function () {
        $intentId = 'pi_alreadypaid_'.uniqid();
        $order = stripeWebhookOrder($intentId, ['payment_status' => 'paid']);

        $eventId = 'evt_alreadypaid_'.uniqid();
        $response = postStripeWebhook($this, $intentId, $order->ulid, eventId: $eventId);

        $response->assertStatus(200);

        // No additional paid PaymentTransaction was created
        $count = PaymentTransaction::where('order_id', $order->id)->where('status', 'paid')->count();
        expect($count)->toBe(0); // initial record was pending; no new paid one
    });

    // ── Fallback: locate order via PaymentTransaction reference ────────────────

    it('finds order via PaymentTransaction reference when order_ulid is absent from metadata', function () {
        $intentId = 'pi_fallback_'.uniqid();
        $order = stripeWebhookOrder($intentId);

        // Send the event WITHOUT the order_ulid in metadata — gateway should fall
        // back to the pending PaymentTransaction reference lookup.
        $response = postStripeWebhook(
            $this,
            $intentId,
            '', // empty order_ulid
            dataObjectOverrides: ['metadata' => []], // no order_ulid
        );

        $response->assertStatus(200);

        $order->refresh();
        expect($order->payment_status)->toBe('paid');
    });
});
