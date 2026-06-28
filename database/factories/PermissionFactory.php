<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Permission>
 */
class PermissionFactory extends Factory
{
    protected $model = Permission::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $module = fake()->randomElement(['user', 'role', 'settings', 'media', 'audit', 'catalogue']);
        $action = fake()->unique()->word();

        return [
            'code' => "{$module}.{$action}",
            'module' => $module,
            'action' => $action,
            'description' => fake()->sentence(),
        ];
    }

    public function code(string $code): static
    {
        [$module, $action] = explode('.', $code, 2) + ['', ''];

        return $this->state([
            'code' => $code,
            'module' => $module,
            'action' => $action,
        ]);
    }
}
