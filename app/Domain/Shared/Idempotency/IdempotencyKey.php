<?php

declare(strict_types=1);

namespace App\Domain\Shared\Idempotency;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $scope
 * @property string $idempotency_key
 * @property string $request_fingerprint
 * @property string $status
 * @property array<string, mixed>|null $response
 */
class IdempotencyKey extends Model
{
    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'scope',
        'idempotency_key',
        'request_fingerprint',
        'status',
        'response',
    ];

    protected $casts = [
        'response' => 'array',
    ];
}
