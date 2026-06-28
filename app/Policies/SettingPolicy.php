<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Services\RBACService;

class SettingPolicy
{
    public function __construct(protected RBACService $rbac) {}

    public function viewAny(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'settings.view');
    }

    public function update(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'settings.update');
    }
}
