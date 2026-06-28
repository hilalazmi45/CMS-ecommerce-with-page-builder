<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Services\RBACService;

class UserPolicy
{
    public function __construct(protected RBACService $rbac) {}

    public function viewAny(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'user.view_all');
    }

    public function view(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return true;
        }

        return $this->rbac->hasPermission($actor, 'user.view_all');
    }

    public function create(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'user.create');
    }

    public function update(User $actor, User $target): bool
    {
        if (! $this->rbac->hasPermission($actor, 'user.update')) {
            return false;
        }

        return $this->rbac->canManageUser($actor, $target);
    }

    public function delete(User $actor, User $target): bool
    {
        if ($actor->id === $target->id) {
            return false;
        }

        if (! $this->rbac->hasPermission($actor, 'user.delete')) {
            return false;
        }

        return $this->rbac->canManageUser($actor, $target);
    }
}
