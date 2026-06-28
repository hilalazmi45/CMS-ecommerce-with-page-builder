<?php

declare(strict_types=1);

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Catalogue\Models\Product;
use App\Domain\Orders\Models\Order;
use App\Domain\Payments\Enums\PaymentStatus;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Exceptions\UnsupportedCapabilityException;
use App\Domain\Payments\Gateways\CodGateway;
use App\Domain\Payments\Models\PaymentTransaction;
use App\Domain\Payments\Services\PaymentGatewayManager;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Payments\ValueObjects\WebhookResult;
use App\Domain\Pricing\ValueObjects\Money;
use App\Domain\Shipping\Models\ShippingZone;
use App\Domain\Shipping\Models\ShippingZoneMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a minimal Order record without going through the full placement flow.
 */
function codOrder(array $overrides = []): Order
{
    return Order::create(array_merge([
        'user_id' => null,
        'status' => 'pending',
        'payment_status' => 'pending',
        'payment_method' => 'cod',
        'currency' => 'MYR',
        'subtotal' => 1000,
        'discount_total' => 0,
        'shipping_total' => 500,
        'tax_total' => 0,
        'total' => 1500,
    ], $overrides));
}

function codAttempt(): PaymentAttemptData
{
    return new PaymentAttemptData(
        idempotencyKey: Str::ulid()->toString(),
        returnUrl: '',
        cancelUrl: '',
    );
}

// ─── CodGateway unit-level tests ──────────────────────────────────────────────

describe('CodGateway', function () {
    it('reports its machine name and human label', function () {
        $gateway = new CodGateway;

        expect($gateway->name())->toBe('cod');
        expect($gateway->label())->toBe('Cash on Delivery');
    });

    it('is enabled by default via config', function () {
        config(['commerce.payments.cod.enabled' => true]);

        expect((new CodGateway)->isEnabled())->toBeTrue();
    });

    it('is disabled when config is false', function () {
        config(['commerce.payments.cod.enabled' => false]);

        expect((new CodGateway)->isEnabled())->toBeFalse();
    });

    it('reports no capabilities', function () {
        $gateway = new CodGateway;

        expect($gateway->supports('refund'))->toBeFalse();
        expect($gateway->supports('webhook'))->toBeFalse();
        expect($gateway->supports('redirect'))->toBeFalse();
        expect($gateway->supports('unknown_capability'))->toBeFalse();
    });

    it('createPayment records a PaymentTransaction with gateway=cod and status=pending', function () {
        $order = codOrder(['total' => 2000]);
        $attempt = codAttempt();

        $result = (new CodGateway)->createPayment($order, $attempt);

        // Result is pending with no redirect URL
        expect($result->status)->toBe(PaymentStatus::Pending);
        expect($result->reference)->toBeNull();
        expect($result->redirectUrl)->toBeNull();

        // Exactly one transaction row created
        expect(PaymentTransaction::count())->toBe(1);

        $tx = PaymentTransaction::first();
        expect($tx->order_id)->toBe($order->id);
        expect($tx->gateway)->toBe('cod');
        expect($tx->status)->toBe('pending');
        expect($tx->amount)->toBe(2000);
        expect($tx->reference)->toBeNull();
        expect($tx->payload)->toHaveKey('idempotency_key', $attempt->idempotencyKey);
    });

    it('createPayment idempotency key is stored in the transaction payload', function () {
        $order = codOrder();
        $key = 'test-idem-key-'.uniqid();
        $attempt = new PaymentAttemptData($key, '', '');

        (new CodGateway)->createPayment($order, $attempt);

        $tx = PaymentTransaction::first();
        expect($tx->payload['idempotency_key'])->toBe($key);
    });

    it('refund() throws UnsupportedCapabilityException', function () {
        $order = codOrder();
        $money = Money::of(500, 'MYR');

        expect(fn () => (new CodGateway)->refund($order, $money, []))
            ->toThrow(UnsupportedCapabilityException::class);
    });

    it('handleWebhook() returns an ignored WebhookResult', function () {
        $request = Request::create('/webhooks/cod', 'POST');
        $result = (new CodGateway)->handleWebhook($request);

        expect($result)->toBeInstanceOf(WebhookResult::class);
        expect($result->handled)->toBeFalse();
        expect($result->orderUlid)->toBeNull();
        expect($result->newStatus)->toBeNull();
    });
});

// ─── PaymentGatewayManager tests ──────────────────────────────────────────────

describe('PaymentGatewayManager', function () {
    it('can register and retrieve a gateway by name', function () {
        $manager = new PaymentGatewayManager;
        $manager->register(new CodGateway);

        $gateway = $manager->get('cod');
        expect($gateway->name())->toBe('cod');
    });

    it('get() throws PaymentException for an unregistered gateway', function () {
        $manager = new PaymentGatewayManager;

        expect(fn () => $manager->get('stripe'))
            ->toThrow(PaymentException::class);
    });

    it('has() returns true for registered gateway and false for unknown', function () {
        $manager = new PaymentGatewayManager;
        $manager->register(new CodGateway);

        expect($manager->has('cod'))->toBeTrue();
        expect($manager->has('stripe'))->toBeFalse();
    });

    it('enabled() includes cod when config is on', function () {
        config(['commerce.payments.cod.enabled' => true]);

        $manager = new PaymentGatewayManager;
        $manager->register(new CodGateway);

        $enabled = $manager->enabled();
        expect($enabled)->toHaveKey('cod');
    });

    it('enabled() excludes cod when config is off', function () {
        config(['commerce.payments.cod.enabled' => false]);

        $manager = new PaymentGatewayManager;
        $manager->register(new CodGateway);

        $enabled = $manager->enabled();
        expect($enabled)->not->toHaveKey('cod');
    });

    it('all() returns every registered gateway regardless of enabled state', function () {
        config(['commerce.payments.cod.enabled' => false]);

        $manager = new PaymentGatewayManager;
        $manager->register(new CodGateway);

        $all = $manager->all();
        expect($all)->toHaveKey('cod');
    });

    it('singleton is registered in the container and returns the same instance', function () {
        $a = app(PaymentGatewayManager::class);
        $b = app(PaymentGatewayManager::class);

        expect($a)->toBe($b);
        // COD is registered by AppServiceProvider
        expect($a->has('cod'))->toBeTrue();
    });
});

// ─── Integration: full checkout flow creates a PaymentTransaction row ──────────

describe('COD checkout integration', function () {
    /**
     * Minimal product, shipping zone, cart, and payload helpers
     * (mirrors CheckoutTest helpers but scoped to this file to avoid naming conflicts).
     */
    function codCheckoutProduct(array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'COD Product',
            'slug' => 'cod-product-'.uniqid(),
            'sku' => 'COD-'.uniqid(),
            'type' => 'simple',
            'status' => 'active',
            'regular_price' => 1000,
            'manage_stock' => true,
            'stock_quantity' => 10,
            'reserved_quantity' => 0,
            'backorders' => 'no',
        ], $overrides));
    }

    function codCheckoutShipping(): ShippingZoneMethod
    {
        $zone = ShippingZone::create(['name' => 'MY-COD', 'regions' => ['MY'], 'sort_order' => 0]);

        return ShippingZoneMethod::create([
            'zone_id' => $zone->id,
            'method_type' => 'flat_rate',
            'title' => 'Standard',
            'cost' => 500,
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    it('placing a COD order creates a payment_transactions row with gateway=cod', function () {
        $product = codCheckoutProduct();
        $method = codCheckoutShipping();

        $token = 'cod-guest-'.uniqid();
        $cart = Cart::create(['session_id' => $token]);
        CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $payload = [
            'email' => 'cod@example.com',
            'shipping_first_name' => 'Jane',
            'shipping_last_name' => 'Doe',
            'shipping_address_1' => '1 Test St',
            'shipping_city' => 'Kuala Lumpur',
            'shipping_country' => 'MY',
            'billing_same_as_shipping' => true,
            'shipping_method_id' => $method->id,
            'payment_method' => 'cod',
            'idempotency_key' => Str::ulid()->toString(),
        ];

        $this->withSession(['cart_token' => $token])
            ->post(route('checkout.store'), $payload)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        // One order placed
        expect(Order::count())->toBe(1);
        $order = Order::first();
        expect($order->payment_status)->toBe('pending');
        expect($order->payment_method)->toBe('cod');

        // Exactly one payment transaction row exists for this order
        $tx = PaymentTransaction::where('order_id', $order->id)->first();
        expect($tx)->not->toBeNull();
        expect($tx->gateway)->toBe('cod');
        expect($tx->status)->toBe('pending');
        expect($tx->amount)->toBe($order->total);
    });

    it('checkout rejects a payment_method that is not a registered enabled gateway', function () {
        $product = codCheckoutProduct();
        $method = codCheckoutShipping();

        $token = 'cod-guest-reject-'.uniqid();
        $cart = Cart::create(['session_id' => $token]);
        CartItem::create(['cart_id' => $cart->id, 'product_id' => $product->id, 'quantity' => 1]);

        $payload = [
            'email' => 'cod@example.com',
            'shipping_first_name' => 'Jane',
            'shipping_last_name' => 'Doe',
            'shipping_address_1' => '1 Test St',
            'shipping_city' => 'Kuala Lumpur',
            'shipping_country' => 'MY',
            'billing_same_as_shipping' => true,
            'shipping_method_id' => $method->id,
            'payment_method' => 'stripe',  // not registered
            'idempotency_key' => Str::ulid()->toString(),
        ];

        // Inertia/web form validation returns a redirect with session errors, not 422.
        $response = $this->withSession(['cart_token' => $token])
            ->post(route('checkout.store'), $payload);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['payment_method']);

        // No order created
        expect(Order::count())->toBe(0);
    });
});
