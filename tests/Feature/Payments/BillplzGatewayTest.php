<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Gateways\BillplzGateway;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\Services\PaymentGatewayManager;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Shipping\Models\ShippingZone;
use App\Domain\Shipping\Models\ShippingZoneMethod;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal Order (with billing address) for gateway unit tests.
 */
function billplzOrder(array $overrides = []): Order
{
    $order = Order::create(array_merge([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'billplz',
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
        'first_name' => 'Ahmad',
        'last_name' => 'Ali',
        'address_1' => '1 Jalan Test',
        'city' => 'Kuala Lumpur',
        'country' => 'MY',
        'email' => 'ahmad@example.com',
    ]);

    return $order;
}

function billplzAttempt(string $returnUrl = 'http://localhost/order-confirmation/test'): PaymentAttemptData
{
    return new PaymentAttemptData(
        idempotencyKey: Str::ulid()->toString(),
        returnUrl: $returnUrl,
        cancelUrl: 'http://localhost/checkout',
    );
}

/**
 * Set Billplz config keys so the gateway reports as enabled.
 */
function enableBillplzConfig(): void
{
    config([
        'commerce.payments.billplz.enabled' => true,
        'commerce.payments.billplz.api_key' => 'test-api-key',
        'commerce.payments.billplz.x_signature_key' => 'test-sig-key',
        'commerce.payments.billplz.collection_id' => 'test-collection-id',
        'commerce.payments.billplz.sandbox' => true,
    ]);
}

/**
 * Fake Billplz bill creation API response.
 */
function fakeBillplzBillSuccess(string $billId = 'bill-123', string $url = 'https://www.billplz-sandbox.com/bills/bill-123'): void
{
    Http::fake([
        '*billplz-sandbox.com/api/v3/bills' => Http::response([
            'id' => $billId,
            'collection_id' => 'test-collection-id',
            'url' => $url,
            'currency' => 'MYR',
            'amount' => 2500,
            'state' => 'due',
        ], 200),
    ]);
}

// ─── BillplzGateway unit tests ────────────────────────────────────────────────

describe('BillplzGateway — isEnabled', function () {
    it('is disabled by default when config key is false', function () {
        config(['commerce.payments.billplz.enabled' => false]);

        expect((new BillplzGateway)->isEnabled())->toBeFalse();
    });

    it('is disabled when enabled=true but credentials are missing', function () {
        config([
            'commerce.payments.billplz.enabled' => true,
            'commerce.payments.billplz.api_key' => '',
            'commerce.payments.billplz.x_signature_key' => '',
            'commerce.payments.billplz.collection_id' => '',
        ]);

        expect((new BillplzGateway)->isEnabled())->toBeFalse();
    });

    it('is disabled when api_key is missing even if other keys are set', function () {
        config([
            'commerce.payments.billplz.enabled' => true,
            'commerce.payments.billplz.api_key' => null,
            'commerce.payments.billplz.x_signature_key' => 'sig-key',
            'commerce.payments.billplz.collection_id' => 'col-id',
        ]);

        expect((new BillplzGateway)->isEnabled())->toBeFalse();
    });

    it('is enabled when all credentials are set', function () {
        enableBillplzConfig();

        expect((new BillplzGateway)->isEnabled())->toBeTrue();
    });
});

describe('BillplzGateway — capabilities', function () {
    it('reports name and label', function () {
        $gw = new BillplzGateway;

        expect($gw->name())->toBe('billplz');
        expect($gw->label())->toBe('Billplz (FPX Online Banking)');
    });

    it('supports redirect, webhook, and refund', function () {
        $gw = new BillplzGateway;

        expect($gw->supports('redirect'))->toBeTrue();
        expect($gw->supports('webhook'))->toBeTrue();
        expect($gw->supports('refund'))->toBeTrue();
        expect($gw->supports('unknown'))->toBeFalse();
    });
});

describe('BillplzGateway — createPayment', function () {
    it('POSTs to sandbox API with correct params and returns redirect result', function () {
        enableBillplzConfig();
        Http::preventStrayRequests();
        fakeBillplzBillSuccess('bill-xyz', 'https://www.billplz-sandbox.com/bills/bill-xyz');

        $order = billplzOrder(['total' => 2500]);
        $attempt = billplzAttempt('http://localhost/confirm/abc');

        $result = (new BillplzGateway)->createPayment($order, $attempt);

        expect($result->status)->toBe(PaymentStatus::RequiresAction);
        expect($result->redirectUrl)->toBe('https://www.billplz-sandbox.com/bills/bill-xyz');
        expect($result->reference)->toBe('bill-xyz');

        // Pending PaymentTransaction must be created
        expect(PaymentTransaction::count())->toBe(1);
        $tx = PaymentTransaction::first();
        expect($tx->gateway)->toBe('billplz');
        expect($tx->status)->toBe('pending');
        expect($tx->amount)->toBe(2500);
        expect($tx->reference)->toBe('bill-xyz');

        Http::assertSent(function ($request) use ($attempt) {
            return str_contains($request->url(), '/bills')
                && $request['collection_id'] === 'test-collection-id'
                && $request['amount'] === 2500
                && $request['currency'] === 'MYR'
                && $request['callback_url'] === route('webhooks.billplz')
                && $request['redirect_url'] === $attempt->returnUrl;
        });
    });

    it('throws PaymentException when Billplz API returns a failure', function () {
        enableBillplzConfig();
        Http::preventStrayRequests();
        Http::fake([
            '*billplz-sandbox.com/api/v3/bills' => Http::response(['error' => ['code' => 'invalid_collection']], 422),
        ]);

        $order = billplzOrder();
        $attempt = billplzAttempt();

        expect(fn () => (new BillplzGateway)->createPayment($order, $attempt))
            ->toThrow(PaymentException::class);

        // No transaction row should be created on failure
        expect(PaymentTransaction::count())->toBe(0);
    });
});

describe('BillplzGateway — computeSignature', function () {
    it('produces the correct HMAC-SHA256 from sorted params', function () {
        config(['commerce.payments.billplz.x_signature_key' => 'secret-key']);

        $params = ['paid' => 'true', 'id' => 'bill-abc', 'amount' => '2500'];
        ksort($params);
        $source = implode('|', array_map(fn ($k, $v) => "{$k}={$v}", array_keys($params), $params));
        $expected = hash_hmac('sha256', $source, 'secret-key');

        $gw = new BillplzGateway;
        $computed = $gw->computeSignature($params);

        expect($computed)->toBe($expected);
    });
});

// ─── PaymentGatewayManager — Billplz registration ────────────────────────────

describe('PaymentGatewayManager with Billplz', function () {
    it('includes billplz in enabled() when properly configured', function () {
        enableBillplzConfig();

        $enabled = app(PaymentGatewayManager::class)->enabled();

        expect($enabled)->toHaveKey('billplz');
    });

    it('excludes billplz from enabled() when config is off', function () {
        config(['commerce.payments.billplz.enabled' => false]);

        $enabled = app(PaymentGatewayManager::class)->enabled();

        expect($enabled)->not->toHaveKey('billplz');
    });

    it('always includes billplz in all()', function () {
        config(['commerce.payments.billplz.enabled' => false]);

        $all = app(PaymentGatewayManager::class)->all();

        expect($all)->toHaveKey('billplz');
    });
});

// ─── Integration: checkout with Billplz redirects user ───────────────────────

describe('Billplz checkout integration', function () {
    function billplzCheckoutProduct(): Product
    {
        return Product::create([
            'name' => 'Billplz Product',
            'slug' => 'billplz-product-'.uniqid(),
            'sku' => 'BPZ-'.uniqid(),
            'type' => 'simple',
            'status' => 'active',
            'regular_price' => 2000,
            'manage_stock' => true,
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
            'backorders' => 'no',
        ]);
    }

    function billplzCheckoutShipping(): ShippingZoneMethod
    {
        $zone = ShippingZone::create(['name' => 'MY-Billplz', 'regions' => ['MY'], 'sort_order' => 0]);

        return ShippingZoneMethod::create([
            'zone_id' => $zone->id,
            'method_type' => 'flat_rate',
            'title' => 'Standard',
            'cost' => 500,
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    it('checkout with billplz creates pending order and redirects to Billplz URL', function () {
        enableBillplzConfig();
        Http::preventStrayRequests();
        fakeBillplzBillSuccess('bill-checkout-1', 'https://www.billplz-sandbox.com/bills/bill-checkout-1');

        $product = billplzCheckoutProduct();
        $method = billplzCheckoutShipping();

        $token = 'billplz-guest-'.uniqid();
        $cart = Cart::create(['session_id' => $token]);
        CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $payload = [
            'email' => 'buyer@example.my',
            'shipping_first_name' => 'Ahmad',
            'shipping_last_name' => 'Ali',
            'shipping_address_1' => '1 Jalan Bukit Bintang',
            'shipping_city' => 'Kuala Lumpur',
            'shipping_country' => 'MY',
            'billing_same_as_shipping' => true,
            'shipping_method_id' => $method->id,
            'payment_method' => 'billplz',
            'idempotency_key' => Str::ulid()->toString(),
        ];

        // Send the request with the X-Inertia header so Inertia::location()
        // returns 409 with an X-Inertia-Location header (the standard Inertia
        // external redirect protocol) rather than a plain 302.
        $response = $this->withSession(['cart_token' => $token])
            ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => '1'])
            ->post(route('checkout.store'), $payload);

        $response->assertStatus(409);
        $response->assertHeader('X-Inertia-Location', 'https://www.billplz-sandbox.com/bills/bill-checkout-1');

        // Order is created with pending payment_status
        expect(Order::count())->toBe(1);
        $order = Order::first();
        expect($order->payment_method)->toBe('billplz');
        expect($order->payment_status)->toBe('pending');
        expect($order->payment_reference)->toBe('bill-checkout-1');

        // A pending PaymentTransaction exists
        $tx = PaymentTransaction::where('order_id', $order->id)->first();
        expect($tx)->not->toBeNull();
        expect($tx->gateway)->toBe('billplz');
        expect($tx->status)->toBe('pending');
        expect($tx->reference)->toBe('bill-checkout-1');
    });

    it('checkout rejects billplz when gateway is disabled', function () {
        config(['commerce.payments.billplz.enabled' => false]);

        $product = billplzCheckoutProduct();
        $method = billplzCheckoutShipping();

        $token = 'billplz-disabled-'.uniqid();
        $cart = Cart::create(['session_id' => $token]);
        CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $payload = [
            'email' => 'buyer@example.my',
            'shipping_first_name' => 'Ahmad',
            'shipping_last_name' => 'Ali',
            'shipping_address_1' => '1 Jalan Test',
            'shipping_city' => 'Kuala Lumpur',
            'shipping_country' => 'MY',
            'billing_same_as_shipping' => true,
            'shipping_method_id' => $method->id,
            'payment_method' => 'billplz',
            'idempotency_key' => Str::ulid()->toString(),
        ];

        $response = $this->withSession(['cart_token' => $token])
            ->post(route('checkout.store'), $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['payment_method']);

        expect(Order::count())->toBe(0);
    });
});
