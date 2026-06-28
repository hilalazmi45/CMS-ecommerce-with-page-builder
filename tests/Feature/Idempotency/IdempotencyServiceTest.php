<?php

declare(strict_types=1);

use App\Domain\Shared\Idempotency\IdempotencyConflictException;
use App\Domain\Shared\Idempotency\IdempotencyKey;
use App\Domain\Shared\Idempotency\IdempotencyService;

it('runs the work once and stores the result', function () {
    $service = new IdempotencyService;
    $calls = 0;

    $result = $service->remember('checkout', 'key-1', ['amount' => 100], function () use (&$calls) {
        $calls++;

        return ['order_id' => 42];
    });

    expect($result)->toBe(['order_id' => 42])
        ->and($calls)->toBe(1);

    $this->assertDatabaseHas('idempotency_keys', [
        'scope' => 'checkout',
        'idempotency_key' => 'key-1',
        'status' => IdempotencyKey::STATUS_COMPLETED,
    ]);
});

it('replays the stored result for a duplicate request without re-running the work', function () {
    $service = new IdempotencyService;
    $calls = 0;
    $work = function () use (&$calls) {
        $calls++;

        return ['order_id' => 7];
    };

    $first = $service->remember('checkout', 'dup', ['amount' => 100], $work);
    $second = $service->remember('checkout', 'dup', ['amount' => 100], $work);

    expect($first)->toBe($second)
        ->and($calls)->toBe(1); // work executed only once

    expect(IdempotencyKey::count())->toBe(1);
});

it('is insensitive to payload key ordering when replaying', function () {
    $service = new IdempotencyService;
    $calls = 0;
    $work = function () use (&$calls) {
        $calls++;

        return ['ok' => true];
    };

    $service->remember('checkout', 'order', ['a' => 1, 'b' => 2], $work);
    $service->remember('checkout', 'order', ['b' => 2, 'a' => 1], $work);

    expect($calls)->toBe(1);
});

it('throws a conflict when the same key is reused with a different payload', function () {
    $service = new IdempotencyService;
    $service->remember('checkout', 'reuse', ['amount' => 100], fn () => ['order_id' => 1]);

    $service->remember('checkout', 'reuse', ['amount' => 999], fn () => ['order_id' => 2]);
})->throws(IdempotencyConflictException::class);

it('throws a conflict while a request with the same key is in progress', function () {
    $service = new IdempotencyService;
    $fingerprint = $service->fingerprint(['amount' => 100]);

    IdempotencyKey::create([
        'scope' => 'checkout',
        'idempotency_key' => 'inflight',
        'request_fingerprint' => $fingerprint,
        'status' => IdempotencyKey::STATUS_PROCESSING,
    ]);

    $service->remember('checkout', 'inflight', ['amount' => 100], fn () => ['order_id' => 1]);
})->throws(IdempotencyConflictException::class);

it('releases the claim when the work throws, allowing a retry', function () {
    $service = new IdempotencyService;

    try {
        $service->remember('checkout', 'boom', ['amount' => 100], function () {
            throw new RuntimeException('payment failed');
        });
    } catch (RuntimeException) {
        // expected
    }

    expect(IdempotencyKey::count())->toBe(0);

    // Retry now succeeds because the claim was released.
    $result = $service->remember('checkout', 'boom', ['amount' => 100], fn () => ['order_id' => 5]);
    expect($result)->toBe(['order_id' => 5]);
});

it('prunes keys older than the cutoff', function () {
    $service = new IdempotencyService;

    $old = IdempotencyKey::create([
        'scope' => 'checkout', 'idempotency_key' => 'old',
        'request_fingerprint' => 'x', 'status' => IdempotencyKey::STATUS_COMPLETED,
    ]);
    $old->forceFill(['created_at' => now()->subDays(10)])->save();

    IdempotencyKey::create([
        'scope' => 'checkout', 'idempotency_key' => 'fresh',
        'request_fingerprint' => 'y', 'status' => IdempotencyKey::STATUS_COMPLETED,
    ]);

    $deleted = $service->prune(now()->subDays(7));

    expect($deleted)->toBe(1)
        ->and(IdempotencyKey::where('idempotency_key', 'fresh')->exists())->toBeTrue()
        ->and(IdempotencyKey::where('idempotency_key', 'old')->exists())->toBeFalse();
});
