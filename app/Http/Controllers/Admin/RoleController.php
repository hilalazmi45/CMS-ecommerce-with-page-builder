<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Shared\Authorization\PermissionRegistry;
use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Services\RBACService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function __construct(private RBACService $rbac) {}

    public function index(): Response
    {
        $this->authorize('viewAny', Role::class);

        return Inertia::render('Admin/Roles/Index', [
            'roles' => Role::withCount('users', 'permissions')->orderBy('level')->get(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Role::class);

        return Inertia::render('Admin/Roles/Create', [
            'permissions' => Permission::orderBy('module')->orderBy('action')->get(),
            'permissionGroups' => PermissionRegistry::grouped(),
        ]);
    }

    public function store(StoreRoleRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $role = Role::create([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'] ?? null,
            'level' => $data['level'],
            'is_custom_role' => true,
            'is_system_role' => false,
            'created_by' => $request->user()->id,
        ]);

        if (! empty($data['permission_ids'])) {
            $role->permissions()->sync($data['permission_ids']);
        }

        ActivityLogger::log('role', 'created', Role::class, $role->id, null, [
            'name' => $role->name,
            'slug' => $role->slug,
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role created successfully.');
    }

    public function edit(Role $role): Response
    {
        $this->authorize('update', $role);

        return Inertia::render('Admin/Roles/Edit', [
            'role' => $role->load('permissions'),
            'permissions' => Permission::orderBy('module')->orderBy('action')->get(),
            'permissionGroups' => PermissionRegistry::grouped(),
        ]);
    }

    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $data = $request->validated();

        $old = ['name' => $role->name, 'slug' => $role->slug];

        $role->update([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'] ?? null,
            'level' => $data['level'],
        ]);

        if (array_key_exists('permission_ids', $data)) {
            $role->permissions()->sync($data['permission_ids'] ?? []);
            $role->users->each(fn ($user) => $this->rbac->clearUserPermissionCache($user));
        }

        ActivityLogger::log('role', 'updated', Role::class, $role->id, $old, [
            'name' => $role->name,
            'slug' => $role->slug,
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role updated successfully.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        $this->authorize('delete', $role);

        $role->permissions()->detach();
        $role->users()->detach();
        $role->delete();

        ActivityLogger::log('role', 'deleted', Role::class, $role->id, [
            'name' => $role->name,
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role deleted successfully.');
    }
}
