<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use App\Services\RBACService;

class RolePolicy
{
    public function __construct(protected RBACService $rbac) {}

    public function viewAny(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'role.view_all');
    }

    public function view(User $actor, Role $role): bool
    {
        return $this->rbac->hasPermission($actor, 'role.view_all');
    }

    public function create(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'role.create_custom');
    }

    public function update(User $actor, Role $role): bool
    {
        if ($role->is_system_role) {
            return false;
        }

        return $this->rbac->hasPermission($actor, 'role.update_custom');
    }

    public function delete(User $actor, Role $role): bool
    {
        if ($role->is_system_role) {
            return false;
        }

        return $this->rbac->hasPermission($actor, 'role.delete_custom');
    }
}
