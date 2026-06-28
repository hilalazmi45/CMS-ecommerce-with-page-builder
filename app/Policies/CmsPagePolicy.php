<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Cms\Models\CmsPage;
use App\Models\User;
use App\Services\RBACService;

class CmsPagePolicy
{
    public function __construct(private RBACService $rbac) {}

    public function viewAny(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'cms.view');
    }

    public function create(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'cms.create');
    }

    public function update(User $user, CmsPage $page): bool
    {
        return $this->rbac->hasPermission($user, 'cms.update');
    }

    public function publish(User $user, CmsPage $page): bool
    {
        return $this->rbac->hasPermission($user, 'cms.publish');
    }

    public function delete(User $user, CmsPage $page): bool
    {
        return $this->rbac->hasPermission($user, 'cms.delete');
    }
}
