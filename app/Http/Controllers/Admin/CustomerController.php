<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()
            ->with(['roles'])
            ->whereHas('roles', fn ($q) => $q->where('slug', 'customer'))
            ->latest();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $query->paginate(20),
            'filters' => $request->only(['search']),
        ]);
    }

    public function show(User $customer): Response
    {
        $this->authorize('view', $customer);

        return Inertia::render('Admin/Customers/Show', [
            'customer' => $customer->load(['roles']),
        ]);
    }

    public function toggleActive(User $customer): RedirectResponse
    {
        $this->authorize('update', $customer);
        $customer->update(['is_active' => ! $customer->is_active]);

        return back()->with('success', $customer->is_active ? 'Customer activated.' : 'Customer disabled.');
    }
}
