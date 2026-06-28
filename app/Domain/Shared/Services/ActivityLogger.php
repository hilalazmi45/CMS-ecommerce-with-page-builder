<?php

declare(strict_types=1);

namespace App\Domain\Shared\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    public static function log(
        string $module,
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        mixed $oldValues = null,
        mixed $newValues = null,
    ): ActivityLog {
        return ActivityLog::create([
            'user_id' => Auth::id(),
            'module' => $module,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
