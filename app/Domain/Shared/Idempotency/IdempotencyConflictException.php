<?php

declare(strict_types=1);

namespace App\Domain\Shared\Idempotency;

use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Thrown when an idempotency key is reused with a different payload, or while a
 * request bearing the same key is still in flight. Renders as HTTP 409.
 */
class IdempotencyConflictException extends RuntimeException implements HttpExceptionInterface
{
    public function getStatusCode(): int
    {
        return 409;
    }

    /** @return array<string, string> */
    public function getHeaders(): array
    {
        return [];
    }
}
