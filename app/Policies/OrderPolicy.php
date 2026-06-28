<?php

declare(strict_types=1);

namespace App\Policies;

use App\Domain\Orders\Models\Order;
use App\Models\User;
use App\Services\RBACService;

class OrderPolicy
{
    public function __construct(private RBACService $rbac) {}

    public function viewAny(User $user): bool
    {
        return $this->rbac->hasPermission($user, 'order.view_all');
    }

    public function view(User $user, Order $order): bool
    {
        return $this->rbac->hasPermission($user, 'order.view_all');
    }

    public function update_status(User $user, Order $order): bool
    {
        return $this->rbac->hasPermission($user, 'order.update_status');
    }

    public function add_note(User $user, Order $order): bool
    {
        return $this->rbac->hasPermission($user, 'order.add_note');
    }

    public function process_refund(User $user, Order $order): bool
    {
        return $this->rbac->hasPermission($user, 'order.process_refund');
    }
}
