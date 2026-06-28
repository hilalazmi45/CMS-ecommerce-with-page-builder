<?php

declare(strict_types=1);

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

/** Helper: create user with given permission codes attached via a fresh role. */
function makeAdminWithPermissions(string ...$codes): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 2]);

    foreach ($codes as $code) {
        $perm = Permission::factory()->code($code)->create();
        $role->permissions()->attach($perm);
    }

    $user->roles()->attach($role);

    return $user;
}

test('unauthenticated user is redirected from roles index', function () {
    $this->get(route('admin.roles.index'))->assertRedirect(route('login'));
});

test('user without role.view_all gets 403 on roles index', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get(route('admin.roles.index'))->assertForbidden();
});

test('user with role.view_all can access roles index', function () {
    $user = makeAdminWithPermissions('role.view_all');

    $this->actingAs($user)
        ->get(route('admin.roles.index'))
        ->assertOk();
});

test('user with role.create_custom can store a new role', function () {
    $user = makeAdminWithPermissions('role.create_custom');

    $this->actingAs($user)
        ->post(route('admin.roles.store'), [
            'name' => 'Test Role',
            'slug' => 'test_role',
            'level' => 5,
            'description' => '',
            'permission_ids' => [],
        ])
        ->assertRedirect(route('admin.roles.index'));

    $this->assertDatabaseHas('roles', ['slug' => 'test_role']);
});

test('user without role.create_custom cannot store a role', function () {
    $user = makeAdminWithPermissions('role.view_all');

    $this->actingAs($user)
        ->post(route('admin.roles.store'), [
            'name' => 'Sneaky Role',
            'slug' => 'sneaky_role',
            'level' => 5,
        ])
        ->assertForbidden();
});

test('user cannot edit a system role — receives 403', function () {
    $user = makeAdminWithPermissions('role.update_custom');
    $systemRole = Role::factory()->system()->create();

    $this->actingAs($user)
        ->get(route('admin.roles.edit', $systemRole))
        ->assertForbidden();
});

test('user can edit a custom role with role.update_custom', function () {
    $user = makeAdminWithPermissions('role.update_custom');
    $customRole = Role::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.roles.edit', $customRole))
        ->assertOk();
});

test('user cannot delete a system role', function () {
    $user = makeAdminWithPermissions('role.delete_custom');
    $systemRole = Role::factory()->system()->create();

    $this->actingAs($user)
        ->delete(route('admin.roles.destroy', $systemRole))
        ->assertForbidden();
});

test('deleting a custom role removes it from the database', function () {
    $user = makeAdminWithPermissions('role.delete_custom');
    $customRole = Role::factory()->create();

    $this->actingAs($user)
        ->delete(route('admin.roles.destroy', $customRole))
        ->assertRedirect(route('admin.roles.index'));

    $this->assertSoftDeleted('roles', ['id' => $customRole->id]);
});
