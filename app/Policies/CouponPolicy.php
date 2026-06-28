<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Promotions\Models\Coupon;
use App\Models\User;
use App\Services\RBACService;

class CouponPolicy
{
    public function __construct(private RBACService $rbac) {}

    public function viewAny(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'promotion.view');
    }

    public function create(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'promotion.create');
    }

    public function update(User $user, Coupon $coupon): bool
    {
        return $this->rbac->hasPermission($user, 'promotion.update');
    }

    public function delete(User $user, Coupon $coupon): bool
    {
        return $this->rbac->hasPermission($user, 'promotion.delete');
    }
}
