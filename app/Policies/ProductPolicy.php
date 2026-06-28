<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Catalogue\Models\Product;
use App\Models\User;
use App\Services\RBACService;

class ProductPolicy
{
    public function __construct(private RBACService $rbac) {}

    public function viewAny(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.view');
    }

    public function create(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.create');
    }

    public function update(User $user, Product $product): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.update');
    }

    public function delete(User $user, Product $product): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.delete');
    }

    public function manage_categories(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.manage_categories');
    }

    public function manage_brands(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'catalogue.manage_brands');
    }
}
