<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;
use App\Http\Middleware\CacheStorefrontPage;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * D1 — Storefront page cache tests.
 *
 * CORRECTNESS FOCUS (CLAUDE.md §12.2):
 *   Inertia shared props embed per-session data (auth, flash, cart, wishlist).
 *   These tests verify that:
 *   1. Anonymous, clean-URL GET requests are cached (MISS → HIT).
 *   2. Authenticated requests are NEVER served from cache.
 *   3. Requests with a cart_token session key bypass the cache entirely.
 *   4. Requests with a query string bypass the cache.
 *   5. After a catalogue model is saved, the cache version bumps so the next
 *      request is a MISS (stale content is never served).
 *   6. When the master flag is disabled (default), no caching occurs at all.
 *
 * Tests use the array cache driver (in-memory, no cross-test leakage) and
 * config('commerce.page_cache.enabled') is overridden per test.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCachePage(array $overrides = []): CmsPage
{
    return CmsPage::create(array_merge([
        'title' => 'Cache Test Page',
        'slug' => 'cache-test-'.uniqid(),
        'status' => 'published',
        'published_at' => now()->subMinute(),
        'builder_content' => ['schemaVersion' => 1, 'components' => []],
    ], $overrides));
}

function makeCacheProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Cache Product',
        'slug' => 'cache-product-'.uniqid(),
        'sku' => 'CACHE-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'manage_stock' => false,
        'stock_quantity' => 99,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

/**
 * Enable page caching via config for the duration of a test.
 * Also switch to the array cache store so tests run in-memory and isolated.
 */
function withCacheEnabled(): void
{
    config([
        'commerce.page_cache.enabled' => true,
        'commerce.page_cache.ttl' => 60,
        'cache.default' => 'array',
    ]);

    // Reset the in-memory version counter so each test starts at v0.
    Cache::forget(CacheStorefrontPage::VERSION_KEY);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

it('returns X-Cache: MISS on first anonymous request and HIT on second', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'about']);

    $first = $this->get('/about');
    $first->assertStatus(200);
    expect($first->headers->get('X-Cache'))->toBe('MISS');

    $second = $this->get('/about');
    $second->assertStatus(200);
    expect($second->headers->get('X-Cache'))->toBe('HIT');
    expect($second->getContent())->toBe($first->getContent());
});

it('serves identical HTML body from cache on HIT', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'body-check']);

    $miss = $this->get('/body-check');
    $hit = $this->get('/body-check');

    expect($hit->getContent())->toBe($miss->getContent());
});

it('never caches authenticated requests', function (): void {
    withCacheEnabled();

    $user = User::factory()->create();
    makeCachePage(['slug' => 'auth-page']);

    // First request — authenticated — should be a MISS (never written to cache).
    $first = $this->actingAs($user)->get('/auth-page');
    $first->assertStatus(200);
    expect($first->headers->get('X-Cache'))->toBeNull();

    // Second request — also authenticated — still no HIT.
    $second = $this->actingAs($user)->get('/auth-page');
    expect($second->headers->get('X-Cache'))->toBeNull();
});

it('never serves a cached page to an authenticated user even if an anonymous request was cached first', function (): void {
    withCacheEnabled();

    $user = User::factory()->create();
    makeCachePage(['slug' => 'mixed-auth']);

    // Warm the cache anonymously.
    $anon = $this->get('/mixed-auth');
    expect($anon->headers->get('X-Cache'))->toBe('MISS');

    // Authenticated request — must bypass the cache entirely.
    $auth = $this->actingAs($user)->get('/mixed-auth');
    expect($auth->headers->get('X-Cache'))->toBeNull(
        'Authenticated users must not receive cached anonymous pages (state leakage risk)'
    );
});

it('bypasses cache when the session contains a cart_token', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'cart-bypass']);

    // Simulate a guest who has added to cart (cart_token is in their session).
    $first = $this->withSession(['cart_token' => 'tok_abc123'])->get('/cart-bypass');
    $first->assertStatus(200);
    expect($first->headers->get('X-Cache'))->toBeNull(
        'A guest with a cart_token must bypass the cache to prevent state leakage'
    );

    // Second request with the same session — still no HIT.
    $second = $this->withSession(['cart_token' => 'tok_abc123'])->get('/cart-bypass');
    expect($second->headers->get('X-Cache'))->toBeNull();
});

it('never writes a cache entry when the request has a cart_token session', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'cart-no-leak']);

    // Determine what cache key would be used for this path at the current version.
    $version = CacheStorefrontPage::currentVersion();
    $key = "page:/cart-no-leak:en:v{$version}";

    // Guest request with cart_token — must bypass; nothing written to cache.
    $this->withSession(['cart_token' => 'tok_xyz'])->get('/cart-no-leak');

    // Verify that no entry exists in cache — the bypass path must never write.
    expect(Cache::has($key))->toBeFalse(
        'A cart-token-session request must never populate the page cache'
    );
});

it('bypasses cache when the URL has a query string', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'qs-bypass']);

    // ?preview=1
    $preview = $this->get('/qs-bypass?preview=1');
    $preview->assertStatus(200);
    expect($preview->headers->get('X-Cache'))->toBeNull(
        '?preview=1 must bypass the cache'
    );

    // Any other query param.
    $paged = $this->get('/qs-bypass?page=2');
    expect($paged->headers->get('X-Cache'))->toBeNull();

    // A clean URL must still warm the cache independently.
    $clean = $this->get('/qs-bypass');
    expect($clean->headers->get('X-Cache'))->toBe('MISS');
});

it('invalidates the cache version when a Product is saved so next request is a MISS', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'product-bust']);

    // Warm the cache.
    $hit1 = $this->get('/product-bust');
    expect($hit1->headers->get('X-Cache'))->toBe('MISS');
    $hit2 = $this->get('/product-bust');
    expect($hit2->headers->get('X-Cache'))->toBe('HIT');

    // Saving a product must bump the version.
    $product = makeCacheProduct();
    $versionBefore = CacheStorefrontPage::currentVersion();
    $product->name = 'Updated Name';
    $product->save();
    $versionAfter = CacheStorefrontPage::currentVersion();
    expect($versionAfter)->toBeGreaterThan($versionBefore);

    // Next anonymous request must be a MISS — stale page must not be served.
    $afterBust = $this->get('/product-bust');
    expect($afterBust->headers->get('X-Cache'))->toBe('MISS');
});

it('invalidates the cache version when a ProductCategory is saved', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'cat-bust']);

    $this->get('/cat-bust'); // warm

    $before = CacheStorefrontPage::currentVersion();

    ProductCategory::create([
        'name' => 'Test Cat '.uniqid(),
        'slug' => 'test-cat-'.uniqid(),
        'is_active' => true,
    ]);

    expect(CacheStorefrontPage::currentVersion())->toBeGreaterThan($before);

    $afterBust = $this->get('/cat-bust');
    expect($afterBust->headers->get('X-Cache'))->toBe('MISS');
});

it('invalidates the cache version when a ProductBrand is saved', function (): void {
    withCacheEnabled();
    makeCachePage(['slug' => 'brand-bust']);

    $this->get('/brand-bust'); // warm

    $before = CacheStorefrontPage::currentVersion();

    ProductBrand::create([
        'name' => 'Test Brand '.uniqid(),
        'slug' => 'test-brand-'.uniqid(),
        'is_active' => true,
    ]);

    expect(CacheStorefrontPage::currentVersion())->toBeGreaterThan($before);

    $afterBust = $this->get('/brand-bust');
    expect($afterBust->headers->get('X-Cache'))->toBe('MISS');
});

it('does not cache when the master flag is disabled (default)', function (): void {
    // Explicitly keep cache disabled — this is the default.
    config([
        'commerce.page_cache.enabled' => false,
        'cache.default' => 'array',
    ]);

    makeCachePage(['slug' => 'no-cache-flag']);

    $first = $this->get('/no-cache-flag');
    $second = $this->get('/no-cache-flag');

    // No X-Cache header at all — middleware is a passthrough.
    expect($first->headers->get('X-Cache'))->toBeNull();
    expect($second->headers->get('X-Cache'))->toBeNull();
});

it('home route is also cached for anonymous clean requests', function (): void {
    withCacheEnabled();

    $first = $this->get('/');
    $first->assertStatus(200);
    expect($first->headers->get('X-Cache'))->toBe('MISS');

    $second = $this->get('/');
    expect($second->headers->get('X-Cache'))->toBe('HIT');
});
