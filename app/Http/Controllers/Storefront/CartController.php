<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Cart\Exceptions\CartException;
use App\Domain\Cart\Models\Cart;
use App\Domain\Cart\Models\CartItem;
use App\Domain\Cart\Services\CartService;
use App\Domain\Inventory\Exceptions\InsufficientStockException;
use App\Domain\Promotions\Exceptions\CouponException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\AddToCartRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    public function index(Request $request): Response
    {
        $cart = $this->currentCart($request);

        // Auto-apply coupon from URL parameter (e.g. ?coupon=CODE).
        if ($cart !== null && $request->query('coupon') !== null) {
            $code = (string) $request->query('coupon');
            try {
                $this->cartService->applyCoupon($cart, $code, $request->user());
            } catch (CouponException) {
                // Swallow silently — invalid codes from URL params are not shown as errors.
            }
        }

        return Inertia::render('Storefront/Cart', [
            'cart' => $this->cartService->summarize($cart, $request->user()),
        ]);
    }

    public function store(AddToCartRequest $request): RedirectResponse
    {
        $cart = $this->currentCart($request, create: true);

        if ($cart === null) {
            // Guest without a session token — create one now.
            $token = $this->sessionToken($request, create: true);
            $cart = $this->cartService->resolve(null, $token, create: true);
        }

        try {
            $this->cartService->add(
                $cart,
                $request->integer('product_id'),
                $request->integer('quantity'),
                $request->integer('variation_id') ?: null,
            );
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'Sorry, there is not enough stock available.');
        } catch (CartException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Added to cart.');
    }

    public function update(Request $request, CartItem $item): RedirectResponse
    {
        $this->authorizeItem($request, $item);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        try {
            $this->cartService->updateQuantity($item, (int) $validated['quantity']);
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'Sorry, there is not enough stock available.');
        } catch (CartException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Cart updated.');
    }

    public function destroy(Request $request, CartItem $item): RedirectResponse
    {
        $this->authorizeItem($request, $item);

        $this->cartService->remove($item);

        return back()->with('success', 'Item removed from cart.');
    }

    public function clear(Request $request): RedirectResponse
    {
        $cart = $this->currentCart($request);

        if ($cart !== null) {
            $this->cartService->clear($cart);
        }

        return back()->with('success', 'Cart cleared.');
    }

    public function applyCoupon(Request $request): RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:191']]);

        $cart = $this->currentCart($request);

        if ($cart === null) {
            return back()->with('error', 'No active cart found.');
        }

        try {
            $this->cartService->applyCoupon($cart, $data['code'], $request->user());
        } catch (CouponException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Coupon applied successfully.');
    }

    public function removeCoupon(Request $request): RedirectResponse
    {
        $cart = $this->currentCart($request);

        if ($cart !== null) {
            $this->cartService->removeCoupon($cart);
        }

        return back()->with('success', 'Coupon removed.');
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    /**
     * Read (or generate) the opaque guest cart session token.
     *
     * When $create is true and no token exists yet, a new ULID is generated
     * and persisted in the session. Never returns null when $create is true.
     */
    private function sessionToken(Request $request, bool $create = false): ?string
    {
        $token = $request->session()->get('cart_token');

        if ($token !== null) {
            return (string) $token;
        }

        if (! $create) {
            return null;
        }

        $token = Str::ulid()->toString();
        $request->session()->put('cart_token', $token);

        return $token;
    }

    /**
     * Resolve the current cart, optionally creating one if it does not exist.
     */
    private function currentCart(Request $request, bool $create = false): ?Cart
    {
        $user = $request->user();
        $sessionToken = $this->sessionToken($request, create: $create);

        return $this->cartService->resolve($user, $sessionToken, $create);
    }

    /**
     * Abort with 403 if the CartItem does not belong to the current request's cart.
     *
     * Prevents cart-ID manipulation (CLAUDE.md §9.3).
     */
    private function authorizeItem(Request $request, CartItem $item): void
    {
        $cart = $this->currentCart($request);

        if ($cart === null || $item->cart_id !== $cart->id) {
            abort(403, 'You do not have permission to modify this cart item.');
        }
    }
}
