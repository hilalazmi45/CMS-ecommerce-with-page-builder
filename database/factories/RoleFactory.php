<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    protected $model = Role::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => ucwords($name),
            'slug' => str_replace(' ', '_', strtolower($name)),
            'description' => fake()->sentence(),
            'level' => fake()->numberBetween(3, 8),
            'is_system_role' => false,
            'is_custom_role' => true,
        ];
    }

    public function system(): static
    {
        return $this->state(['is_system_role' => true, 'is_custom_role' => false]);
    }

    public function withPermission(Permission $permission): static
    {
        return $this->afterCreating(function (Role $role) use ($permission) {
            $role->permissions()->attach($permission);
        });
    }
}
