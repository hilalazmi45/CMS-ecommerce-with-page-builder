<?php

declare(strict_types=1);

namespace App\Domain\Shared\Idempotency;

use Closure;
use DateTimeInterface;
use Illuminate\Database\QueryException;
use Throwable;

/**
 * Replay-safe execution of a one-shot operation keyed by a client-supplied
 * idempotency key. Used by high-risk endpoints (checkout, payment, refund) so
 * a retried/duplicated request never performs the work twice.
 *
 * Contract:
 *  - First call for a (scope, key): claims the key, runs $work, stores the
 *    result, and returns it.
 *  - Repeat call with the SAME payload after completion: replays the stored
 *    result without running $work again.
 *  - Repeat call with a DIFFERENT payload, or while the first is still
 *    in flight: throws IdempotencyConflictException (HTTP 409).
 *  - If $work throws, the claim is released so the operation can be retried.
 */
class IdempotencyService
{
    /**
     * @param  array<string, mixed>  $payload
     * @param  Closure():array<string, mixed>  $work
     * @return array<string, mixed>
     */
    public function remember(string $scope, string $key, array $payload, Closure $work): array
    {
        $fingerprint = $this->fingerprint($payload);

        $record = $this->claim($scope, $key, $fingerprint);

        if ($record === null) {
            return $this->resolveExisting($scope, $key, $fingerprint);
        }

        try {
            $result = $work();
        } catch (Throwable $e) {
            $record->delete(); // release the claim → retry is allowed
            throw $e;
        }

        $record->update([
            'status' => IdempotencyKey::STATUS_COMPLETED,
            'response' => $result,
        ]);

        return $result;
    }

    /** Delete idempotency records created before the given time. Returns rows removed. */
    public function prune(DateTimeInterface $before): int
    {
        return IdempotencyKey::where('created_at', '<', $before)->delete();
    }

    /**
     * Stable SHA-256 fingerprint of a payload, independent of key ordering.
     *
     * @param  array<string, mixed>  $payload
     */
    public function fingerprint(array $payload): string
    {
        $this->recursiveKsort($payload);

        return hash('sha256', (string) json_encode(
            $payload,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        ));
    }

    /** Attempt to insert the claim row; returns null if the key already exists. */
    private function claim(string $scope, string $key, string $fingerprint): ?IdempotencyKey
    {
        try {
            return IdempotencyKey::create([
                'scope' => $scope,
                'idempotency_key' => $key,
                'request_fingerprint' => $fingerprint,
                'status' => IdempotencyKey::STATUS_PROCESSING,
            ]);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return null;
            }

            throw $e;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveExisting(string $scope, string $key, string $fingerprint): array
    {
        $existing = IdempotencyKey::query()
            ->where('scope', $scope)
            ->where('idempotency_key', $key)
            ->first();

        if ($existing === null) {
            // The claim was released between our failed insert and this read.
            throw new IdempotencyConflictException('Idempotent request could not be resolved; please retry.');
        }

        if (! hash_equals($existing->request_fingerprint, $fingerprint)) {
            throw new IdempotencyConflictException('Idempotency key reused with a different request payload.');
        }

        if ($existing->status === IdempotencyKey::STATUS_COMPLETED) {
            return $existing->response ?? [];
        }

        throw new IdempotencyConflictException('A request with this idempotency key is already in progress.');
    }

    /** @param array<mixed> $data */
    private function recursiveKsort(array &$data): void
    {
        ksort($data);

        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->recursiveKsort($value);
            }
        }
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');
        $driverCode = $e->errorInfo[1] ?? null;

        return $sqlState === '23000'                                   // ANSI / MySQL integrity constraint
            || $driverCode === 1062                                    // MySQL duplicate entry
            || str_contains($e->getMessage(), 'UNIQUE constraint failed'); // SQLite
    }
}
