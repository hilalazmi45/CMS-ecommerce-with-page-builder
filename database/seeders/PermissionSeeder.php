<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Shared\Authorization\PermissionRegistry;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionRegistry::all() as $code => $description) {
            [$module, $action] = explode('.', $code, 2);

            Permission::updateOrCreate(
                ['code' => $code],
                ['module' => $module, 'action' => $action, 'description' => $description],
            );
        }

        $this->command->info('Permissions seeded: '.Permission::count().' total.');
    }
}
