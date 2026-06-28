<?php

declare(strict_types=1);

use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Gateways\StripeGateway;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\Services\PaymentGatewayManager;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal Order for Stripe gateway unit tests.
 *
 * @param  array<string, mixed>  $overrides
 */
function stripeOrder(array $overrides = []): Order
{
    $order = Order::create(array_merge([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'stripe',
        'currency' => 'MYR',
        'subtotal' => 2000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 2500,
    ], $overrides));

    OrderAddress::create([
        'order_id' => $order->id,
        'type' => 'billing',
        'first_name' => 'Tan',
        'last_name' => 'Wei',
        'address_1' => '5 Jalan Test',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'email' => 'tanwei@example.my',
    ]);

    return $order;
}

function stripeAttempt(string $returnUrl = 'http://localhost/order-confirmation/test'): PaymentAttemptData
{
    return new PaymentAttemptData(
        idempotencyKey: Str::ulid()->toString(),
        returnUrl: $returnUrl,
        cancelUrl: 'http://localhost/checkout',
    );
}

/**
 * Configure Stripe config keys so the gateway reports as enabled.
 */
function enableStripeConfig(): void
{
    config([
        'commerce.payments.stripe.enabled' => true,
        'commerce.payments.stripe.public_key' => 'pk_test_abc123',
        'commerce.payments.stripe.secret_key' => 'sk_test_abc123',
        'commerce.payments.stripe.webhook_secret' => 'whsec_test_secret',
    ]);
}

/**
 * Build a fake Stripe PaymentIntent API response.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function fakeStripeIntentResponse(
    string $intentId = 'pi_test_abc123',
    string $clientSecret = 'pi_test_abc123_secret_xyz',
    array $overrides = [],
): array {
    return array_merge([
        'id' => $intentId,
        'object' => 'payment_intent',
        'amount' => 2500,
        'currency' => 'myr',
        'status' => 'requires_payment_method',
        'client_secret' => $clientSecret,
    ], $overrides);
}

// ─── Gateway unit tests ────────────────────────────────────────────────────────

describe('StripeGateway', function () {

    // ── isEnabled / registration ───────────────────────────────────────────────

    it('is disabled by default (STRIPE_ENABLED=false)', function () {
        config(['commerce.payments.stripe.enabled' => false]);

        $gateway = new StripeGateway;
        expect($gateway->isEnabled())->toBeFalse();
    });

    it('is disabled when enabled flag is true but credentials are missing', function () {
        config([
            'commerce.payments.stripe.enabled' => true,
            'commerce.payments.stripe.secret_key' => null,
            'commerce.payments.stripe.webhook_secret' => null,
        ]);

        $gateway = new StripeGateway;
        expect($gateway->isEnabled())->toBeFalse();
    });

    it('is disabled when secret_key is present but webhook_secret is missing', function () {
        config([
            'commerce.payments.stripe.enabled' => true,
            'commerce.payments.stripe.secret_key' => 'sk_test_abc',
            'commerce.payments.stripe.webhook_secret' => null,
        ]);

        $gateway = new StripeGateway;
        expect($gateway->isEnabled())->toBeFalse();
    });

    it('is enabled when flag and all required credentials are set', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        expect($gateway->isEnabled())->toBeTrue();
    });

    it('is registered in PaymentGatewayManager', function () {
        $manager = app(PaymentGatewayManager::class);
        expect($manager->has('stripe'))->toBeTrue();
        expect($manager->get('stripe'))->toBeInstanceOf(StripeGateway::class);
    });

    it('reports correct name and label', function () {
        $gateway = new StripeGateway;
        expect($gateway->name())->toBe('stripe');
        expect($gateway->label())->toBe('Card (Stripe)');
    });

    it('supports webhook and refund but not redirect', function () {
        $gateway = new StripeGateway;
        expect($gateway->supports('webhook'))->toBeTrue();
        expect($gateway->supports('refund'))->toBeTrue();
        expect($gateway->supports('redirect'))->toBeFalse();
    });

    // ── createPayment ──────────────────────────────────────────────────────────

    it('createPayment posts correct payload to Stripe and returns pending result with client_secret', function () {
        enableStripeConfig();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.stripe.com/v1/payment_intents' => Http::response(
                fakeStripeIntentResponse('pi_test_001', 'pi_test_001_secret_abc'),
                200,
            ),
        ]);

        $gateway = new StripeGateway;
        $order = stripeOrder();
        $attempt = stripeAttempt();

        $result = $gateway->createPayment($order, $attempt);

        // Correct HTTP call shape
        Http::assertSent(function ($request) use ($order) {
            return str_contains($request->url(), '/v1/payment_intents')
                && $request['amount'] == $order->total
                && $request['currency'] === 'myr'
                && isset($request['metadata[order_ulid]'])
                && $request['metadata[order_ulid]'] === $order->ulid
                && isset($request['automatic_payment_methods[enabled]']);
        });

        // Returns pending status with client_secret in meta
        expect($result->status)->toBe(PaymentStatus::Pending);
        expect($result->reference)->toBe('pi_test_001');
        expect($result->redirectUrl)->toBeNull();
        expect($result->meta['client_secret'])->toBe('pi_test_001_secret_abc');
    });

    it('createPayment records a pending PaymentTransaction', function () {
        enableStripeConfig();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.stripe.com/v1/payment_intents' => Http::response(
                fakeStripeIntentResponse('pi_test_txn_001'),
                200,
            ),
        ]);

        $gateway = new StripeGateway;
        $order = stripeOrder();

        $gateway->createPayment($order, stripeAttempt());

        $tx = PaymentTransaction::where('order_id', $order->id)->first();
        expect($tx)->not->toBeNull();
        expect($tx->gateway)->toBe('stripe');
        expect($tx->status)->toBe('pending');
        expect($tx->amount)->toBe(2500);
        expect($tx->reference)->toBe('pi_test_txn_001');
        // client_secret must NOT be stored in the payload
        expect(isset($tx->payload['client_secret']))->toBeFalse();
    });

    it('createPayment throws PaymentException on Stripe HTTP failure', function () {
        enableStripeConfig();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.stripe.com/v1/payment_intents' => Http::response(
                ['error' => ['type' => 'card_error', 'code' => 'card_declined', 'message' => 'Your card was declined.']],
                402,
            ),
        ]);

        $gateway = new StripeGateway;
        $order = stripeOrder();

        expect(fn () => $gateway->createPayment($order, stripeAttempt()))
            ->toThrow(PaymentException::class);
    });

    // ── refund ────────────────────────────────────────────────────────────────

    it('refund() posts to Stripe refunds endpoint and records a refund transaction', function () {
        enableStripeConfig();
        Http::preventStrayRequests();
        Http::fake([
            'https://api.stripe.com/v1/refunds' => Http::response([
                'id' => 're_test_001',
                'object' => 'refund',
                'amount' => 2500,
                'currency' => 'myr',
                'payment_intent' => 'pi_test_refund_001',
                'status' => 'succeeded',
            ], 200),
        ]);

        $gateway = new StripeGateway;
        $order = stripeOrder(['payment_reference' => 'pi_test_refund_001', 'payment_status' => 'paid']);

        $result = $gateway->refund($order, new Money(2500, 'MYR'), []);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/v1/refunds')
                && $request['payment_intent'] === 'pi_test_refund_001'
                && $request['amount'] == 2500;
        });

        expect($result->success)->toBeTrue();
        expect($result->reference)->toBe('re_test_001');

        $tx = PaymentTransaction::where('order_id', $order->id)
            ->where('status', 'refunded')
            ->first();
        expect($tx)->not->toBeNull();
        expect($tx->gateway)->toBe('stripe');
        expect($tx->amount)->toBe(2500);
    });

    it('refund() throws PaymentException when order has no payment_reference', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $order = stripeOrder(['payment_reference' => null]);

        expect(fn () => $gateway->refund($order, new Money(1000, 'MYR'), []))
            ->toThrow(PaymentException::class);
    });

    // ── handleWebhook ─────────────────────────────────────────────────────────

    it('handleWebhook returns ignored() for unrecognised event types', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $timestamp = time();
        $body = json_encode(['id' => 'evt_001', 'type' => 'customer.created', 'data' => ['object' => []]]);
        $sig = hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_test_secret');

        $request = Request::create('/webhooks/stripe', 'POST', [], [], [], [], $body);
        $request->headers->set('Stripe-Signature', "t={$timestamp},v1={$sig}");

        $result = $gateway->handleWebhook($request);

        expect($result->handled)->toBeFalse();
    });

    it('handleWebhook returns invalid when Stripe-Signature header is missing', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $request = Request::create('/webhooks/stripe', 'POST', [], [], [], [], '{}');

        $result = $gateway->handleWebhook($request);

        expect($result->handled)->toBeFalse();
        expect($result->meta['reason'])->toBe('missing_signature_header');
    });

    it('handleWebhook rejects invalid HMAC signature', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $timestamp = time();
        $body = json_encode(['id' => 'evt_bad', 'type' => 'payment_intent.succeeded', 'data' => ['object' => []]]);

        // Use a valid-format (all-hex) but incorrect HMAC value.
        $wrongSig = str_repeat('a', 64);
        $request = Request::create('/webhooks/stripe', 'POST', [], [], [], [], $body);
        $request->headers->set('Stripe-Signature', "t={$timestamp},v1={$wrongSig}");

        $result = $gateway->handleWebhook($request);

        expect($result->handled)->toBeFalse();
        expect($result->meta['reason'])->toBe('invalid_signature');
    });

    it('handleWebhook rejects stale timestamp (replay attack prevention)', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $staleTimestamp = time() - 400; // older than 300 s tolerance
        $body = json_encode(['id' => 'evt_stale', 'type' => 'payment_intent.succeeded', 'data' => ['object' => []]]);
        $sig = hash_hmac('sha256', $staleTimestamp.'.'.$body, 'whsec_test_secret');

        $request = Request::create('/webhooks/stripe', 'POST', [], [], [], [], $body);
        $request->headers->set('Stripe-Signature', "t={$staleTimestamp},v1={$sig}");

        $result = $gateway->handleWebhook($request);

        expect($result->handled)->toBeFalse();
        expect($result->meta['reason'])->toBe('stale_timestamp');
    });

    it('handleWebhook parses payment_intent.succeeded and returns Paid status with meta', function () {
        enableStripeConfig();

        $gateway = new StripeGateway;
        $timestamp = time();
        $orderUlid = Str::ulid()->toString();
        $body = json_encode([
            'id' => 'evt_pi_success',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_test_success',
                    'amount' => 2500,
                    'currency' => 'myr',
                    'metadata' => ['order_ulid' => $orderUlid],
                ],
            ],
        ]);
        $sig = hash_hmac('sha256', $timestamp.'.'.$body, 'whsec_test_secret');

        $request = Request::create('/webhooks/stripe', 'POST', [], [], [], [], $body);
        $request->headers->set('Stripe-Signature', "t={$timestamp},v1={$sig}");

        $result = $gateway->handleWebhook($request);

        expect($result->handled)->toBeTrue();
        expect($result->newStatus)->toBe(PaymentStatus::Paid);
        expect($result->orderUlid)->toBe($orderUlid);
        expect($result->meta['event_id'])->toBe('evt_pi_success');
        expect($result->meta['payment_intent'])->toBe('pi_test_success');
        expect($result->meta['amount'])->toBe(2500);
        expect($result->meta['currency'])->toBe('myr');
    });
});
