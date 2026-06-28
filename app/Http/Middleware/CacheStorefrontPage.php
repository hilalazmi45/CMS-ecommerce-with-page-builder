<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\PageBuilder\Services\BuilderService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * D1 — Full-page cache for anonymous storefront GET requests.
 *
 * CORRECTNESS RULES (CLAUDE.md §12.2):
 *   Inertia shared props embed per-session data (auth, flash, cart, wishlist).
 *   A cached response must NEVER be served to a request that would produce
 *   different shared props — doing so would leak one visitor's cart/auth state
 *   to another. We therefore apply very conservative bypass conditions:
 *
 *   Bypass (never read or write cache) when ANY of:
 *     • method is not GET
 *     • the user is authenticated
 *     • the session contains a 'cart_token' key (guest who has ever added to cart)
 *     • the request URL has a query string (e.g. ?preview=1, pagination, filters)
 *     • the response status is not 200
 *     • the master flag PAGE_CACHE_ENABLED is false (default)
 *
 *   Cache key:  page:{path}:{locale}:v{version}
 *   Version:    a global integer counter stored in cache that is incremented
 *               whenever catalogue or builder content changes, effectively
 *               invalidating all page-cache entries without needing cache tags.
 *
 * @see BuilderService
 * @see Product
 * @see ProductCategory
 * @see ProductBrand
 */
class CacheStorefrontPage
{
    /** Cache key for the global version counter. */
    public const VERSION_KEY = 'storefront_cache_version';

    /**
     * Increment the global cache version, invalidating all cached pages.
     * Called by BuilderService on publish and by catalogue model observers.
     */
    public static function bustAll(): void
    {
        Cache::increment(self::VERSION_KEY);
    }

    /** Return the current global version (0 when the key has never been set). */
    public static function currentVersion(): int
    {
        return (int) Cache::get(self::VERSION_KEY, 0);
    }

    public function handle(Request $request, Closure $next): Response
    {
        // Master kill-switch — off by default (§16.4).
        if (! config('commerce.page_cache.enabled', false)) {
            return $next($request);
        }

        // Only GET requests can be cached.
        if (! $request->isMethod('GET')) {
            return $next($request);
        }

        // Authenticated users always see fresh, personalised content.
        if ($request->user() !== null) {
            return $next($request);
        }

        // A guest who has ever added to cart has a cart_token in their session.
        // The session carries per-session cart/wishlist state that would leak if
        // we served a cached response to a different visitor. Bypass entirely.
        if ($request->session()->has('cart_token')) {
            return $next($request);
        }

        // Any query string (preview, filters, pagination, UTM, etc.) — bypass.
        // We only cache clean path-based URLs for the highest-traffic anonymous
        // pages; query variations are too numerous to key correctly.
        if ($request->getQueryString() !== null && $request->getQueryString() !== '') {
            return $next($request);
        }

        $key = $this->cacheKey($request);
        $ttl = (int) config('commerce.page_cache.ttl', 3600);

        // Cache HIT — serve immediately.
        /** @var string|null $cached */
        $cached = Cache::get($key);
        if ($cached !== null) {
            return response($cached, 200, [
                'Content-Type' => 'text/html; charset=utf-8',
                'X-Cache' => 'HIT',
            ]);
        }

        // Cache MISS — run the request.
        /** @var Response $response */
        $response = $next($request);

        // Only cache successful HTML responses.
        if ($response->getStatusCode() === 200
            && str_contains($response->headers->get('Content-Type', ''), 'text/html')
        ) {
            Cache::put($key, $response->getContent(), $ttl);
            $response->headers->set('X-Cache', 'MISS');
        }

        return $response;
    }

    private function cacheKey(Request $request): string
    {
        $path = $request->getPathInfo();
        $locale = app()->getLocale();
        $version = self::currentVersion();

        return "page:{$path}:{$locale}:v{$version}";
    }
}
