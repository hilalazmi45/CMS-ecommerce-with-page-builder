<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Default Currency
    |--------------------------------------------------------------------------
    |
    | The ISO 4217 currency code used for all monetary amounts in the commerce
    | domain. Set COMMERCE_CURRENCY in your environment to override.
    |
    */
    'currency' => env('COMMERCE_CURRENCY', 'MYR'),

    /*
    |--------------------------------------------------------------------------
    | Payment Gateways
    |--------------------------------------------------------------------------
    |
    | Enable or disable individual payment gateways. Each gateway reads its
    | own sub-key from this section. Set the corresponding env variable to
    | false to disable a gateway without removing the code.
    |
    */
    /*
    |--------------------------------------------------------------------------
    | Storefront Page Cache (D1)
    |--------------------------------------------------------------------------
    |
    | Full-page HTML cache for anonymous storefront GET requests. Disabled by
    | default so correctness can be confirmed before enabling (CLAUDE.md §16.4).
    |
    | enabled   — master switch; keep false until the render pipeline is stable.
    | ttl       — seconds to keep a cached page (default 1 hour).
    |
    */
    'page_cache' => [
        'enabled' => env('PAGE_CACHE_ENABLED', false),
        'ttl' => (int) env('PAGE_CACHE_TTL', 3600),
    ],

    'payments' => [
        'cod' => [
            'enabled' => env('COMMERCE_COD_ENABLED', true),
        ],

        /*
        |----------------------------------------------------------------------
        | Billplz (Malaysian FPX Online Banking)
        |----------------------------------------------------------------------
        |
        | Redirect-flow gateway for Malaysian FPX transactions. Disabled by
        | default. All three credential keys must be set for the gateway to
        | become enabled. Obtain credentials from https://billplz.com.
        |
        | x_signature_key — used to verify server-to-server callbacks. Set
        | this in your Billplz portal under "API & Webhook Keys".
        |
        */
        'billplz' => [
            'enabled' => env('BILLPLZ_ENABLED', false),
            'api_key' => env('BILLPLZ_API_KEY'),
            'x_signature_key' => env('BILLPLZ_X_SIGNATURE_KEY'),
            'collection_id' => env('BILLPLZ_COLLECTION_ID'),
            'sandbox' => env('BILLPLZ_SANDBOX', true),
        ],

        /*
        |----------------------------------------------------------------------
        | Stripe (Card — Payment Intents / client-intent flow)
        |----------------------------------------------------------------------
        |
        | Client-intent gateway for card payments via Stripe Elements.
        | Disabled by default. secret_key and webhook_secret must both be set
        | for the gateway to become enabled. Obtain credentials from
        | https://dashboard.stripe.com/apikeys.
        |
        | public_key     — safe to expose to the browser (used by Stripe Elements).
        | secret_key     — server-side only; never returned to the browser.
        | webhook_secret — used to verify Stripe-Signature headers on callbacks.
        |
        | NOTE: The Stripe Elements frontend (Stripe.js + @stripe/stripe-js)
        | is intentionally deferred — see StripeGateway::createPayment() docblock.
        |
        */
        'stripe' => [
            'enabled' => env('STRIPE_ENABLED', false),
            'public_key' => env('STRIPE_PUBLIC_KEY'),
            'secret_key' => env('STRIPE_SECRET_KEY'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        ],
    ],
];
