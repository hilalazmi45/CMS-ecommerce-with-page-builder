<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

function actingAsWithPermission(string ...$codes): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 3]);

    foreach ($codes as $code) {
        $perm = Permission::factory()->code($code)->create();
        $role->permissions()->attach($perm);
    }

    $user->roles()->attach($role);

    return $user;
}

test('user can update a custom role when they have role.update_custom', function () {
    $actor = actingAsWithPermission('role.update_custom');
    $role = Role::factory()->create();

    expect($actor->can('update', $role))->toBeTrue();
});

test('user cannot update a system role even with role.update_custom', function () {
    $actor = actingAsWithPermission('role.update_custom');
    $role = Role::factory()->system()->create();

    expect($actor->can('update', $role))->toBeFalse();
});

test('user cannot delete a system role', function () {
    $actor = actingAsWithPermission('role.delete_custom');
    $role = Role::factory()->system()->create();

    expect($actor->can('delete', $role))->toBeFalse();
});

test('user without role.update_custom cannot update a custom role', function () {
    $actor = actingAsWithPermission('role.view_all');
    $role = Role::factory()->create();

    expect($actor->can('update', $role))->toBeFalse();
});

test('super admin can update any custom role', function () {
    $superRole = Role::factory()->create(['slug' => 'super_administrator', 'level' => 1]);
    $actor = User::factory()->create();
    $actor->roles()->attach($superRole);

    $role = Role::factory()->create();
    expect($actor->can('update', $role))->toBeTrue();
});

test('super admin bypasses policy and can update even system roles', function () {
    $superRole = Role::factory()->create(['slug' => 'super_administrator', 'level' => 1]);
    $actor = User::factory()->create();
    $actor->roles()->attach($superRole);

    $systemRole = Role::factory()->system()->create();

    // Gate::before returns true for super admin, bypassing the policy's system-role block
    expect($actor->can('update', $systemRole))->toBeTrue();
});
