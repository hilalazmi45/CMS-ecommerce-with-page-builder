<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'developer@senwave.com.my'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('changeme123!'),
                'is_active' => true,
                'must_change_password' => true,
                'email_verified_at' => now(),
            ],
        );

        $superAdminRole = Role::where('slug', 'super_administrator')->firstOrFail();
        $user->roles()->syncWithoutDetaching([$superAdminRole->id]);

        $this->command->info("Super admin ready: {$user->email} (must change password on first login)");
    }
}
