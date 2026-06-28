<?php

declare(strict_types=1);

use App\Http\Middleware\CacheStorefrontPage;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // D1 — Register a named alias so storefront routes can opt-in with
        // ->middleware('cache.storefront') without adding it to every request.
        $middleware->alias([
            'cache.storefront' => CacheStorefrontPage::class,
        ]);

        // Exempt webhook endpoints from CSRF verification. Provider callbacks
        // do not include a CSRF token — signature verification is the primary
        // security mechanism for these routes (CLAUDE.md §10.3).
        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
