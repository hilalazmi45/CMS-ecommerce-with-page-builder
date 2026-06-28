<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Media\Models\Media;
use App\Models\User;
use App\Services\RBACService;

class MediaPolicy
{
    public function __construct(protected RBACService $rbac) {}

    public function viewAny(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'media.view');
    }

    public function view(User $actor, Media $media): bool
    {
        return $this->rbac->hasPermission($actor, 'media.view');
    }

    public function create(User $actor): bool
    {
        return $this->rbac->hasPermission($actor, 'media.upload');
    }

    public function delete(User $actor, Media $media): bool
    {
        return $this->rbac->hasPermission($actor, 'media.delete');
    }
}
