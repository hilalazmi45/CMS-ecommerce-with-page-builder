<?php

declare(strict_types=1);

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\Storefront\AccountController;
use App\Http\Controllers\Storefront\BrandController;
use App\Http\Controllers\Storefront\CartController;
use App\Http\Controllers\Storefront\CategoryController;
use App\Http\Controllers\Storefront\CheckoutController;
use App\Http\Controllers\Storefront\CmsPageController;
use App\Http\Controllers\Storefront\CompareController;
use App\Http\Controllers\Storefront\FormSubmissionController;
use App\Http\Controllers\Storefront\HomeController;
use App\Http\Controllers\Storefront\ProductController;
use App\Http\Controllers\Storefront\ReviewController;
use App\Http\Controllers\Storefront\SearchController;
use App\Http\Controllers\Storefront\WishlistController;
use App\Http\Controllers\Webhooks\BillplzWebhookController;
use App\Http\Controllers\Webhooks\StripeWebhookController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ─── Webhook routes — CSRF-exempt (verified by provider signatures) ───────────
// These must be registered before any CSRF middleware group and before the
// catch-all slug route. Signature verification inside each gateway/controller
// is the primary security mechanism (CLAUDE.md §10.3).
Route::post('/webhooks/billplz', [BillplzWebhookController::class, 'handle'])->name('webhooks.billplz');
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle'])->name('webhooks.stripe');

// ─── Public storefront routes ─────────────────────────────────────────────────
// NOTE: the catch-all /{slug} route must stay last in this file to avoid
// shadowing the more specific routes above it.

// D1 — Cacheable storefront GET routes (anonymous, no query-string, HTML only).
// The middleware itself enforces all bypass conditions; applying it only to these
// specific routes ensures it never touches admin, cart, checkout, account, or
// webhook paths.
Route::get('/', [HomeController::class, 'index'])->name('storefront.home')->middleware('cache.storefront');

// ─── Cart routes — registered before the catch-all slug route ─────────────────
Route::get('/cart', [CartController::class, 'index'])->name('cart.index');
Route::post('/cart/add', [CartController::class, 'store'])->name('cart.add')->middleware('throttle:30,1');
Route::patch('/cart/items/{item}', [CartController::class, 'update'])->name('cart.items.update')->middleware('throttle:60,1');
Route::delete('/cart/items/{item}', [CartController::class, 'destroy'])->name('cart.items.destroy');
Route::delete('/cart', [CartController::class, 'clear'])->name('cart.clear');
Route::post('/cart/coupon', [CartController::class, 'applyCoupon'])->name('cart.coupon.apply')->middleware('throttle:20,1');
Route::delete('/cart/coupon', [CartController::class, 'removeCoupon'])->name('cart.coupon.remove');

// ─── Checkout routes — registered before the catch-all slug route ─────────────
Route::get('/checkout', [CheckoutController::class, 'index'])->name('checkout.index');
Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store')->middleware('throttle:10,1');
Route::post('/checkout/shipping-methods', [CheckoutController::class, 'shippingMethods'])->name('checkout.shipping-methods');
Route::get('/order-confirmation/{order:ulid}', [CheckoutController::class, 'confirmation'])->name('checkout.confirmation');

Route::get('/product/{product:slug}', [ProductController::class, 'show'])
    ->name('storefront.product')
    ->middleware('cache.storefront');

// ─── Product reviews — auth required, rate-limited ────────────────────────────
Route::post('/product/{product:slug}/reviews', [ReviewController::class, 'store'])
    ->name('storefront.product.reviews.store')
    ->middleware(['auth', 'throttle:10,1']);

Route::get('/product-category/{category:slug}', [CategoryController::class, 'show'])
    ->name('storefront.category')
    ->middleware('cache.storefront');

Route::get('/brand/{brand:slug}', [BrandController::class, 'show'])
    ->name('storefront.brand')
    ->middleware('cache.storefront');

// ─── Wishlist toggle — auth required, rate-limited ───────────────────────────
Route::post('/wishlist/toggle', [WishlistController::class, 'toggle'])
    ->name('wishlist.toggle')
    ->middleware(['auth', 'throttle:60,1']);

// ─── Compare page — public ────────────────────────────────────────────────────
Route::get('/compare', [CompareController::class, 'index'])->name('compare.index');

// ─── Search routes — registered before the catch-all slug route ───────────────
Route::get('/search/suggest', [SearchController::class, 'suggest'])->name('storefront.search.suggest')->middleware('throttle:60,1');
Route::get('/search', [SearchController::class, 'index'])->name('storefront.search.index');

// ─── Form submission — public, rate-limited ───────────────────────────────────
Route::post('/forms/submit', [FormSubmissionController::class, 'store'])->name('storefront.forms.submit')->middleware('throttle:5,1');

// ─── My Account routes — registered before the catch-all slug route ──────────
Route::middleware(['auth'])->prefix('my-account')->name('account.')->group(function () {
    Route::get('/', [AccountController::class, 'dashboard'])->name('dashboard');
    Route::get('/orders', [AccountController::class, 'orders'])->name('orders');
    Route::get('/orders/{order:ulid}', [AccountController::class, 'showOrder'])->name('orders.show');
    Route::get('/addresses', [AccountController::class, 'addresses'])->name('addresses');
    Route::post('/addresses', [AccountController::class, 'storeAddress'])->name('addresses.store');
    Route::put('/addresses/{address:ulid}', [AccountController::class, 'updateAddress'])->name('addresses.update');
    Route::delete('/addresses/{address:ulid}', [AccountController::class, 'destroyAddress'])->name('addresses.destroy');
    Route::get('/details', [AccountController::class, 'details'])->name('details');

    // Wishlist sub-pages
    Route::get('/wishlist', [WishlistController::class, 'index'])->name('wishlist');
    Route::delete('/wishlist/{wishlist}', [WishlistController::class, 'destroy'])->name('wishlist.destroy');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
require __DIR__.'/admin.php';

// ─── Sitemap — MUST be registered before the catch-all slug route ────────────
// Returns a standards-compliant XML sitemap of all published/active content.
// D8: public, no auth, correct application/xml content-type.
Route::get('/sitemap.xml', [SitemapController::class, 'index'])->name('sitemap');

// ─── CMS catch-all — MUST be registered last ─────────────────────────────────
// This matches any single-segment slug and hands off to the CmsPageController
// which does its own published-page lookup. More specific routes above take
// precedence. Multi-segment URLs (e.g. /admin/*) are unaffected because the
// admin routes are loaded above via require.
Route::get('/{slug}', [CmsPageController::class, 'show'])
    ->name('storefront.cms-page')
    ->where('slug', '[a-z0-9\-]+')
    ->middleware('cache.storefront');
