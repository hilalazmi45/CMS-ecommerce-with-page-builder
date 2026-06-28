<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RBACService;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

function makeUserWithPermission(string $code): User
{
    $permission = Permission::factory()->code($code)->create();
    $role = Role::factory()->withPermission($permission)->create();
    $user = User::factory()->create();
    $user->roles()->attach($role);

    return $user;
}

function makeUserWithRole(string $slug): User
{
    $role = Role::factory()->create(['slug' => $slug]);
    $user = User::factory()->create();
    $user->roles()->attach($role);

    return $user;
}

test('hasPermission returns true when user has the permission via role', function () {
    $user = makeUserWithPermission('user.view_all');
    $rbac = app(RBACService::class);

    expect($rbac->hasPermission($user, 'user.view_all'))->toBeTrue();
});

test('hasPermission returns false when user lacks the permission', function () {
    $user = makeUserWithPermission('user.view_all');
    $rbac = app(RBACService::class);

    expect($rbac->hasPermission($user, 'role.create'))->toBeFalse();
});

test('hasPermission returns true for super admin regardless of explicit permissions', function () {
    $role = Role::factory()->create(['slug' => 'super_administrator', 'level' => 1]);
    $user = User::factory()->create();
    $user->roles()->attach($role);

    $rbac = app(RBACService::class);
    expect($rbac->hasPermission($user, 'any.permission'))->toBeTrue();
});

test('isSuperAdmin returns true only for user with super_administrator role', function () {
    $superRole = Role::factory()->create(['slug' => 'super_administrator', 'level' => 1]);
    $superUser = User::factory()->create();
    $superUser->roles()->attach($superRole);

    $normalUser = User::factory()->create();

    $rbac = app(RBACService::class);
    expect($rbac->isSuperAdmin($superUser))->toBeTrue();
    expect($rbac->isSuperAdmin($normalUser))->toBeFalse();
});

test('getUserPermissions returns deduplicated list of permission codes', function () {
    $pA = Permission::factory()->code('user.view_all')->create();
    $pB = Permission::factory()->code('role.create')->create();
    $roleA = Role::factory()->withPermission($pA)->create();
    $roleB = Role::factory()->withPermission($pA)->withPermission($pB)->create();
    $user = User::factory()->create();
    $user->roles()->attach([$roleA->id, $roleB->id]);

    $rbac = app(RBACService::class);
    $perms = $rbac->getUserPermissions($user);

    expect($perms)->toContain('user.view_all')
        ->toContain('role.create')
        ->and(array_count_values($perms)['user.view_all'])->toBe(1); // deduplicated
});

test('getUserPermissions is cached and the cache can be cleared', function () {
    $user = makeUserWithPermission('settings.view');
    $rbac = app(RBACService::class);

    $first = $rbac->getUserPermissions($user);
    expect($first)->toContain('settings.view');

    // Attach new permission directly in DB — bypassing RBACService
    $newPerm = Permission::factory()->code('settings.update')->create();
    $user->roles()->first()->permissions()->attach($newPerm);

    // Cached result should not include new permission yet
    $cached = $rbac->getUserPermissions($user);
    expect($cached)->not->toContain('settings.update');

    // After clearing cache, fresh query returns new permission
    $rbac->clearUserPermissionCache($user);
    $fresh = $rbac->getUserPermissions($user);
    expect($fresh)->toContain('settings.update');
});

test('hasAnyPermission returns true when user has at least one', function () {
    $user = makeUserWithPermission('media.view');
    $rbac = app(RBACService::class);

    expect($rbac->hasAnyPermission($user, 'media.delete', 'media.view'))->toBeTrue();
    expect($rbac->hasAnyPermission($user, 'media.delete', 'media.upload'))->toBeFalse();
});

test('hasAllPermissions returns true only when user has all', function () {
    $pA = Permission::factory()->code('audit.view')->create();
    $pB = Permission::factory()->code('audit.export')->create();
    $role = Role::factory()->create();
    $role->permissions()->attach([$pA->id, $pB->id]);
    $user = User::factory()->create();
    $user->roles()->attach($role);

    $rbac = app(RBACService::class);
    expect($rbac->hasAllPermissions($user, 'audit.view', 'audit.export'))->toBeTrue();
    expect($rbac->hasAllPermissions($user, 'audit.view', 'role.create'))->toBeFalse();
});

test('canManageUser compares levels correctly', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::factory()->create(['level' => 2]));

    $editor = User::factory()->create();
    $editor->roles()->attach(Role::factory()->create(['level' => 5]));

    $rbac = app(RBACService::class);
    expect($rbac->canManageUser($admin, $editor))->toBeTrue();
    expect($rbac->canManageUser($editor, $admin))->toBeFalse();
});
