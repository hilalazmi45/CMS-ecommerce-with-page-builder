<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Cart\Services\CartService;
use App\Domain\Orders\Events\OrderPlaced;
use App\Domain\Orders\Events\OrderRefunded;
use App\Domain\Orders\Events\OrderShipped;
use App\Domain\Orders\Listeners\SendOrderConfirmedEmail;
use App\Domain\Orders\Listeners\SendOrderRefundedEmail;
use App\Domain\Orders\Listeners\SendOrderShippedEmail;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Domain\Payments\Gateways\BillplzGateway;
use App\Domain\Payments\Gateways\CodGateway;
use App\Domain\Payments\Gateways\StripeGateway;
use App\Domain\Payments\Services\PaymentGatewayManager;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // StorefrontContext is request-scoped: one instance per HTTP request.
        // Controllers call a setter, then HandleInertiaRequests reads the state.
        $this->app->scoped(StorefrontContext::class, fn () => new StorefrontContext);

        // PaymentGatewayManager is a singleton — one registry per process.
        // Register all gateway implementations here so the checkout validation
        // rule and OrderPlacementService can resolve them without additional wiring.
        $this->app->singleton(PaymentGatewayManager::class, function (): PaymentGatewayManager {
            $manager = new PaymentGatewayManager;
            $manager->register(new CodGateway);
            $manager->register(new BillplzGateway);
            $manager->register(new StripeGateway);

            return $manager;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // ── Order transactional email listeners (B6) ──────────────────────────────
        // Explicit registration for clarity; auto-discovery is available but
        // explicit wiring is easier to audit for security-sensitive mail paths.
        Event::listen(OrderPlaced::class, SendOrderConfirmedEmail::class);
        Event::listen(OrderShipped::class, SendOrderShippedEmail::class);
        Event::listen(OrderRefunded::class, SendOrderRefundedEmail::class);

        // Merge guest cart into user cart on login.
        //
        // We only run this when a cart_token session value exists (i.e. the guest
        // accumulated cart items before logging in). The merge is resilient: stock
        // overflows are silently capped rather than thrown so login always succeeds.
        Event::listen(Login::class, function (Login $event): void {
            /** @var mixed $user */
            $user = $event->user;

            if (! ($user instanceof User)) {
                return;
            }

            $sessionToken = session('cart_token');

            if (! is_string($sessionToken) || $sessionToken === '') {
                return;
            }

            try {
                app(CartService::class)->mergeOnLogin($user, $sessionToken);
            } catch (\Throwable $e) {
                // Merge failure must never prevent login from completing.
                Log::warning('Cart merge on login failed: '.$e->getMessage(), [
                    'user_id' => $user->id,
                ]);
            }
        });
    }
}
