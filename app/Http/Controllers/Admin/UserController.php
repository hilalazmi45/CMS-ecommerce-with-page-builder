<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\RBACService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(private RBACService $rbac) {}

    public function index(): Response
    {
        $this->authorize('viewAny', User::class);

        $users = User::with('roles')
            ->orderBy('name')
            ->paginate(25);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('Admin/Users/Create', [
            'roles' => Role::orderBy('level')->get(['id', 'name', 'slug', 'level']),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_active' => $data['is_active'] ?? true,
            'must_change_password' => true,
        ]);

        if (! empty($data['role_ids'])) {
            $user->roles()->sync($data['role_ids']);
        }

        ActivityLogger::log('user', 'created', User::class, $user->id, null, [
            'name' => $user->name,
            'email' => $user->email,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user->load('roles'),
            'roles' => Role::orderBy('level')->get(['id', 'name', 'slug', 'level']),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        $old = ['name' => $user->name, 'email' => $user->email, 'is_active' => $user->is_active];

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'is_active' => $data['is_active'] ?? $user->is_active,
        ]);

        if (! empty($data['password'])) {
            $user->update(['password' => $data['password']]);
        }

        if (array_key_exists('role_ids', $data)) {
            $user->roles()->sync($data['role_ids'] ?? []);
            $this->rbac->clearUserPermissionCache($user);
        }

        ActivityLogger::log('user', 'updated', User::class, $user->id, $old, [
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $user->roles()->detach();
        $user->delete();

        ActivityLogger::log('user', 'deleted', User::class, $user->id, [
            'name' => $user->name,
            'email' => $user->email,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }
}
