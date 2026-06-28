<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Shared\Idempotency\IdempotencyService;
use Illuminate\Console\Command;

class PruneIdempotencyKeys extends Command
{
    protected $signature = 'idempotency:prune {--hours=72 : Delete keys older than this many hours}';

    protected $description = 'Delete expired idempotency keys so the table does not grow unbounded.';

    public function handle(IdempotencyService $service): int
    {
        $hours = (int) $this->option('hours');
        $deleted = $service->prune(now()->subHours($hours));

        $this->info("Pruned {$deleted} idempotency key(s) older than {$hours}h.");

        return self::SUCCESS;
    }
}
