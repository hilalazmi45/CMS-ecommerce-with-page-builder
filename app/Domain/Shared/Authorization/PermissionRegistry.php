<?php

declare(strict_types=1);

namespace App\Domain\Shared\Authorization;

class PermissionRegistry
{
    /** @return array<string, string> code => description */
    public static function all(): array
    {
        return [
            // Users
            'user.view_all' => 'View all users',
            'user.create' => 'Create users',
            'user.update' => 'Update users',
            'user.delete' => 'Delete users',

            // Roles
            'role.view_all' => 'View all roles',
            'role.create_custom' => 'Create custom roles',
            'role.update_custom' => 'Update custom roles',
            'role.delete_custom' => 'Delete custom roles',

            // Permissions
            'permission.view_all' => 'View all permissions',

            // Settings
            'settings.view' => 'View system settings',
            'settings.update' => 'Update system settings',

            // Media
            'media.view' => 'View media library',
            'media.upload' => 'Upload media files',
            'media.delete' => 'Delete media files',

            // Audit
            'audit.view' => 'View audit logs',

            // --- Phase 2: Catalogue ---
            'catalogue.view' => 'View products',
            'catalogue.create' => 'Create products',
            'catalogue.update' => 'Update products',
            'catalogue.delete' => 'Delete products',
            'catalogue.publish' => 'Publish products',
            'catalogue.manage_categories' => 'Manage categories',
            'catalogue.manage_brands' => 'Manage brands',
            'catalogue.manage_attributes' => 'Manage attributes',

            // --- Phase 2: Inventory ---
            'inventory.view' => 'View inventory',
            'inventory.adjust' => 'Adjust stock levels',

            // --- Phase 3: Orders ---
            'order.view_all' => 'View all orders',
            'order.update_status' => 'Update order status',
            'order.process_refund' => 'Process refunds',
            'order.add_note' => 'Add order notes',
            'order.export' => 'Export orders',

            // --- Phase 4: Customers ---
            'customer.view_all' => 'View all customers',
            'customer.update' => 'Update customer profiles',
            'customer.disable' => 'Disable customer accounts',

            // --- Phase 5: Promotions ---
            'promotion.view' => 'View promotions',
            'promotion.create' => 'Create promotions',
            'promotion.update' => 'Update promotions',
            'promotion.delete' => 'Delete promotions',

            // --- Phase 6: CMS / Page Builder ---
            'cms.view' => 'View CMS pages',
            'cms.create' => 'Create CMS pages',
            'cms.update' => 'Edit CMS pages',
            'cms.publish' => 'Publish CMS pages',
            'cms.delete' => 'Delete CMS pages',

            // --- Reviews ---
            'reviews.moderate' => 'Moderate product reviews',

            // --- Reports ---
            'report.view' => 'View reports',
            'report.export' => 'Export reports',
        ];
    }

    /** @return array<string, array<string, string>> module => [code => description] */
    public static function grouped(): array
    {
        $grouped = [];
        foreach (self::all() as $code => $description) {
            [$module] = explode('.', $code, 2);
            $grouped[$module][$code] = $description;
        }

        return $grouped;
    }
}
