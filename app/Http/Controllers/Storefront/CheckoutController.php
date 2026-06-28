<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Services\CartService;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Orders\Events\OrderPlaced;
use App\Domain\Orders\Exceptions\CheckoutException;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Services\OrderPlacementService;
use App\Domain\Orders\ValueObjects\CheckoutData;
use App\Domain\Payments\Exceptions\PaymentException;
use App\Domain\Payments\Services\PaymentInitiationService;
use App\Domain\Payments\ValueObjects\PaymentAttemptData;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Domain\Shared\Idempotency\IdempotencyConflictException;
use App\Domain\Shared\Idempotency\IdempotencyService;
use App\Domain\Shipping\Exceptions\ShippingException;
use App\Domain\Shipping\Services\ShippingService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\StoreCheckoutRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
        private readonly OrderPlacementService $orderPlacementService,
        private readonly IdempotencyService $idempotencyService,
        private readonly ShippingService $shippingService,
        private readonly PaymentInitiationService $paymentInitiationService,
    ) {}

    /**
     * Render the checkout page.
     *
     * Redirects to cart when the cart is empty. Passes cart summary and a fresh
     * idempotency key to the Inertia page; shipping methods are re-fetched when
     * the user changes their address.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $cart = $this->currentCart($request);

        if ($cart === null || $cart->items()->count() === 0) {
            return redirect()->route('cart.index');
        }

        $cartSummary = $this->cartService->summarize($cart, $request->user());

        // Provide available shipping methods for a known country if possible,
        // otherwise pass an empty array and let the UI re-fetch on address input.
        $shippingMethods = [];

        return Inertia::render('Storefront/Checkout', [
            'cart' => $cartSummary,
            'shippingMethods' => $shippingMethods,
            'idempotencyKey' => Str::ulid()->toString(),
        ]);
    }

    /**
     * Process the checkout submission.
     *
     * Wraps placement in the IdempotencyService so a duplicate submit (same
     * idempotency_key, same payload) replays the stored order_ulid without
     * creating a second order.
     */
    public function store(StoreCheckoutRequest $request): RedirectResponse|\Symfony\Component\HttpFoundation\Response
    {
        $cart = $this->currentCart($request);

        if ($cart === null || $cart->items()->count() === 0) {
            return redirect()->route('cart.index');
        }

        $data = CheckoutData::fromValidated($request->validated());

        // Fingerprint excludes the idempotency_key itself so it only covers the
        // meaningful order payload.
        $fingerprint = $request->only([
            'email', 'phone',
            'shipping_first_name', 'shipping_last_name', 'shipping_company',
            'shipping_address_1', 'shipping_address_2', 'shipping_city',
            'shipping_state', 'shipping_postcode', 'shipping_country',
            'billing_same_as_shipping',
            'billing_first_name', 'billing_last_name', 'billing_address_1',
            'billing_city', 'billing_country',
            'shipping_method_id', 'payment_method', 'customer_note',
        ]);

        try {
            $result = $this->idempotencyService->remember(
                scope: 'checkout',
                key: $data->idempotencyKey,
                payload: $fingerprint,
                work: function () use ($cart, $data, $request): array {
                    // Place the order (DB transaction — no payment I/O inside).
                    $order = $this->orderPlacementService->place(
                        $cart,
                        $data,
                        $request->user(),
                        $request->ip(),
                    );

                    // Initiate payment post-commit (may make external HTTP calls).
                    $attempt = new PaymentAttemptData(
                        idempotencyKey: $data->idempotencyKey,
                        returnUrl: route('checkout.confirmation', ['order' => $order->ulid]),
                        cancelUrl: route('checkout.index'),
                    );

                    $paymentResult = $this->paymentInitiationService->initiate(
                        $order,
                        $data->paymentMethod,
                        $attempt,
                    );

                    // Dispatch post-commit. The idempotency closure runs exactly once
                    // per (scope, key) pair, so this fires exactly once per placement —
                    // never on an idempotent replay (CLAUDE.md §4.3).
                    event(new OrderPlaced($order));

                    return [
                        'order_ulid' => $order->ulid,
                        'redirect_url' => $paymentResult->redirectUrl,
                    ];
                },
            );
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'Sorry, one or more items are out of stock. Please review your cart.');
        } catch (ShippingException $e) {
            return back()->with('error', 'The selected shipping method is not available for your address. Please choose another.');
        } catch (CouponException $e) {
            return back()->with('error', 'Your coupon could not be applied: '.$e->getMessage());
        } catch (CheckoutException $e) {
            return back()->with('error', $e->getMessage());
        } catch (PaymentException $e) {
            return back()->with('error', 'Payment could not be initiated. Please try again or choose a different payment method.');
        } catch (IdempotencyConflictException) {
            return back()->with('error', 'A duplicate submission was detected. Please wait and check your orders before retrying.');
        }

        $orderUlid = (string) $result['order_ulid'];

        // Store the order ulid in the session so the owner can view confirmation
        // without being authenticated (guest checkout support).
        $request->session()->push('recent_orders', $orderUlid);

        // For redirect gateways (Billplz, PayPal), send the customer to the
        // provider's hosted payment page. Inertia::location() performs a full
        // browser redirect (not an Inertia navigation) so it works with external URLs.
        $redirectUrl = $result['redirect_url'] ?? null;
        if (is_string($redirectUrl) && $redirectUrl !== '') {
            return Inertia::location($redirectUrl);
        }

        return redirect()->route('checkout.confirmation', ['order' => $orderUlid]);
    }

    /**
     * Return available shipping methods for the given address and current cart subtotal.
     *
     * Used by the checkout UI when the shipping address changes (AJAX-style
     * Inertia or plain JSON).
     */
    public function shippingMethods(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country' => ['required', 'string', 'size:2'],
            'state' => ['nullable', 'string', 'max:191'],
        ]);

        $cart = $this->currentCart($request);
        $subtotalMinor = 0;

        if ($cart !== null) {
            $summary = $this->cartService->summarize($cart, $request->user());
            $subtotalMinor = (int) $summary['totals']['subtotal'];
        }

        $methods = $this->shippingService->availableMethods(
            $validated['country'],
            $validated['state'] ?? null,
            $subtotalMinor,
        );

        return response()->json(
            $methods->values()->map(fn ($m) => [
                'id' => $m->id,
                'title' => $m->title,
                'method_type' => $m->method_type,
                'cost' => $m->cost,
                'is_free' => $m->isFree(),
            ])->all()
        );
    }

    /**
     * Show the order confirmation page.
     *
     * Authorises ownership: the authenticated user whose ID matches the order,
     * OR any session that has the order ulid in 'recent_orders'.
     */
    public function confirmation(Request $request, Order $order): Response
    {
        $user = $request->user();

        $ownedByUser = $user !== null && $order->user_id !== null && $user->id === $order->user_id;
        $ownedBySession = in_array($order->ulid, $request->session()->get('recent_orders', []), true);

        if (! $ownedByUser && ! $ownedBySession) {
            abort(403, 'You do not have permission to view this order.');
        }

        $order->load(['items', 'addresses']);

        // Curate the payload — never expose internal fields (ip_address,
        // admin_note, user_id, internal status history) to the customer (§6.3/§11.3).
        return Inertia::render('Storefront/OrderConfirmation', [
            'order' => [
                'ulid' => $order->ulid,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'currency' => $order->currency,
                'subtotal' => $order->subtotal,
                'discount_total' => $order->discount_total,
                'shipping_total' => $order->shipping_total,
                'tax_total' => $order->tax_total,
                'total' => $order->total,
                'coupon_code' => $order->coupon_code,
                'shipping_method' => $order->shipping_method,
                'customer_note' => $order->customer_note,
                'created_at' => $order->created_at,
                'items' => $order->items->map(fn (OrderItem $i): array => [
                    'name' => $i->name,
                    'sku' => $i->sku,
                    'quantity' => $i->quantity,
                    'unit_price' => $i->unit_price,
                    'total' => $i->total,
                    'meta' => $i->meta,
                ])->all(),
                'addresses' => $order->addresses->map(fn (OrderAddress $a): array => [
                    'type' => $a->type,
                    'first_name' => $a->first_name,
                    'last_name' => $a->last_name,
                    'company' => $a->company,
                    'address_1' => $a->address_1,
                    'address_2' => $a->address_2,
                    'city' => $a->city,
                    'state' => $a->state,
                    'postcode' => $a->postcode,
                    'country' => $a->country,
                    'phone' => $a->phone,
                    'email' => $a->email,
                ])->all(),
            ],
        ]);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private function sessionToken(Request $request): ?string
    {
        $token = $request->session()->get('cart_token');

        return $token !== null ? (string) $token : null;
    }

    private function currentCart(Request $request): ?Cart
    {
        return $this->cartService->resolve(
            $request->user(),
            $this->sessionToken($request),
            false,
        );
    }
}
