<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class RBACService
{
    private const CACHE_TTL = 3600;

    public function isSuperAdmin(User $user): bool
    {
        return $user->roles()->where('slug', 'super_administrator')->exists();
    }

    public function hasPermission(User $user, string $permission): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        return in_array($permission, $this->getUserPermissions($user), true);
    }

    public function hasAnyPermission(User $user, string ...$permissions): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        $userPerms = $this->getUserPermissions($user);
        foreach ($permissions as $permission) {
            if (in_array($permission, $userPerms, true)) {
                return true;
            }
        }

        return false;
    }

    public function hasAllPermissions(User $user, string ...$permissions): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        $userPerms = $this->getUserPermissions($user);
        foreach ($permissions as $permission) {
            if (! in_array($permission, $userPerms, true)) {
                return false;
            }
        }

        return true;
    }

    public function hasRole(User $user, string $roleSlug): bool
    {
        return $user->roles()->where('slug', $roleSlug)->exists();
    }

    /** @return list<string> */
    public function getUserPermissions(User $user): array
    {
        $cacheKey = "user_permissions_{$user->id}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($user) {
            return $user->roles()
                ->with('permissions')
                ->get()
                ->flatMap(fn ($role) => $role->permissions->pluck('code'))
                ->unique()
                ->values()
                ->all();
        });
    }

    public function getUserLevel(User $user): int
    {
        $minLevel = $user->roles()->min('level');

        return $minLevel ?? 99;
    }

    public function canManageUser(User $actor, User $target): bool
    {
        return $this->getUserLevel($actor) <= $this->getUserLevel($target);
    }

    public function clearUserPermissionCache(User|int $user): void
    {
        $id = $user instanceof User ? $user->id : $user;
        Cache::forget("user_permissions_{$id}");
    }
}
