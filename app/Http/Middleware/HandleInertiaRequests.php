<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Cart\Services\CartService;
use App\Domain\Customers\Models\Wishlist;
use App\Domain\PageBuilder\Services\ConditionResolver;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Models\Setting;
use App\Services\RBACService;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        $user = $request->user();
        $rbac = app(RBACService::class);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'ulid' => $user->ulid,
                    'name' => $user->name,
                    'email' => $user->email,
                ] : null,
                'roles' => $user ? $user->roles->pluck('slug') : [],
                'permissions' => $user ? $rbac->getUserPermissions($user) : [],
                'isSuperAdmin' => $user ? $rbac->isSuperAdmin($user) : false,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],

            // A4 — Global design system tokens (palette, typography presets, spacing).
            // is_public=true so these are shared with every page (storefront + admin).
            // Lazily evaluated to avoid DB hit when the setting table is empty.
            'designSystem' => fn (): array => [
                'colors' => Setting::get('design_system', 'ds_colors', []),
                'typography' => Setting::get('design_system', 'ds_typography', []),
                'spacing' => Setting::get('design_system', 'ds_spacing', []),
            ],

            // Active header and footer theme templates resolved by display
            // conditions (Elementor-style). The storefront controllers set the
            // current page context on StorefrontContext; the ConditionResolver
            // picks the best-matching active template for each type.
            // Lazily evaluated — no DB hit on admin-only pages.
            'storefront' => fn (): array => [
                'header' => app(ConditionResolver::class)
                    ->matchedContent('header', app(StorefrontContext::class)),
                'footer' => app(ConditionResolver::class)
                    ->matchedContent('footer', app(StorefrontContext::class)),
            ],

            // Wishlist summary shared with every Inertia page for authenticated
            // users. Resolved lazily. Guests receive an empty structure.
            'wishlist' => function () use ($request): array {
                $user = $request->user();

                if ($user === null) {
                    return ['count' => 0, 'product_ids' => []];
                }

                $productIds = Wishlist::where('user_id', $user->id)
                    ->pluck('product_id')
                    ->all();

                return [
                    'count' => count($productIds),
                    'product_ids' => $productIds,
                ];
            },

            // Cart summary shared with every Inertia page. Resolved lazily
            // (closure) so Inertia evaluates it on full-page visits only.
            // create=false: never creates a cart just for the header badge.
            'cart' => function () use ($request): array {
                $user = $request->user();
                $sessionToken = $request->session()->get('cart_token');

                $cart = app(CartService::class)->resolve(
                    $user,
                    is_string($sessionToken) ? $sessionToken : null,
                    false,
                );

                return app(CartService::class)->summarize($cart);
            },
        ];
    }
}
