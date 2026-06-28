<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /** @var array<string, array{name: string, level: int, permissions: list<string>}> */
    private array $roles = [
        'super_administrator' => [
            'name' => 'Super Administrator',
            'level' => 1,
            'permissions' => [],  // assigned all after creation
        ],
        'administrator' => [
            'name' => 'Administrator',
            'level' => 2,
            'permissions' => [
                'user.view_all', 'user.create', 'user.update', 'user.delete',
                'role.view_all', 'role.create_custom', 'role.update_custom', 'role.delete_custom',
                'permission.view_all',
                'settings.view', 'settings.update',
                'media.view', 'media.upload', 'media.delete',
                'audit.view',
                'catalogue.view', 'catalogue.create', 'catalogue.update', 'catalogue.delete', 'catalogue.publish',
                'catalogue.manage_categories', 'catalogue.manage_brands', 'catalogue.manage_attributes',
                'inventory.view', 'inventory.adjust',
                'order.view_all', 'order.update_status', 'order.process_refund', 'order.add_note', 'order.export',
                'customer.view_all', 'customer.update', 'customer.disable',
                'promotion.view', 'promotion.create', 'promotion.update', 'promotion.delete',
                'cms.view', 'cms.create', 'cms.update', 'cms.publish', 'cms.delete',
                'report.view', 'report.export',
            ],
        ],
        'store_manager' => [
            'name' => 'Store Manager',
            'level' => 3,
            'permissions' => [
                'user.view_all',
                'role.view_all',
                'settings.view',
                'media.view', 'media.upload', 'media.delete',
                'audit.view',
                'catalogue.view', 'catalogue.create', 'catalogue.update', 'catalogue.publish',
                'catalogue.manage_categories', 'catalogue.manage_brands', 'catalogue.manage_attributes',
                'inventory.view', 'inventory.adjust',
                'order.view_all', 'order.update_status', 'order.add_note', 'order.export',
                'customer.view_all', 'customer.update',
                'promotion.view', 'promotion.create', 'promotion.update',
                'cms.view', 'cms.create', 'cms.update', 'cms.publish',
                'report.view', 'report.export',
            ],
        ],
        'catalogue_manager' => [
            'name' => 'Catalogue Manager',
            'level' => 5,
            'permissions' => [
                'media.view', 'media.upload',
                'catalogue.view', 'catalogue.create', 'catalogue.update', 'catalogue.publish',
                'catalogue.manage_categories', 'catalogue.manage_brands', 'catalogue.manage_attributes',
                'inventory.view',
            ],
        ],
        'inventory_manager' => [
            'name' => 'Inventory Manager',
            'level' => 5,
            'permissions' => [
                'catalogue.view',
                'inventory.view', 'inventory.adjust',
                'order.view_all',
                'report.view',
            ],
        ],
        'order_fulfilment' => [
            'name' => 'Order Fulfilment',
            'level' => 5,
            'permissions' => [
                'catalogue.view',
                'inventory.view',
                'order.view_all', 'order.update_status', 'order.add_note', 'order.export',
                'customer.view_all',
            ],
        ],
        'marketing' => [
            'name' => 'Marketing',
            'level' => 6,
            'permissions' => [
                'media.view', 'media.upload',
                'catalogue.view',
                'promotion.view', 'promotion.create', 'promotion.update',
                'cms.view', 'cms.create', 'cms.update', 'cms.publish',
                'report.view',
            ],
        ],
        'customer_service' => [
            'name' => 'Customer Service',
            'level' => 6,
            'permissions' => [
                'catalogue.view',
                'order.view_all', 'order.add_note',
                'customer.view_all', 'customer.update',
            ],
        ],
        'customer' => [
            'name' => 'Customer',
            'level' => 9,
            'permissions' => [],
        ],
    ];

    public function run(): void
    {
        $allPermissions = Permission::all()->keyBy('code');

        foreach ($this->roles as $slug => $config) {
            $role = Role::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $config['name'],
                    'level' => $config['level'],
                    'is_system_role' => true,
                    'is_custom_role' => false,
                ],
            );

            $permissionIds = $slug === 'super_administrator'
                ? $allPermissions->pluck('id')->all()
                : $allPermissions->only($config['permissions'])->pluck('id')->all();

            $role->permissions()->sync($permissionIds);
        }

        $this->command->info('Roles seeded: '.Role::count().' total.');
    }
}
