<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Promotions\Models\Coupon;
use App\Domain\Promotions\Services\CouponService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CouponController extends Controller
{
    public function __construct(private CouponService $couponService) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Coupon::class);

        return Inertia::render('Admin/Coupons/Index', [
            'coupons' => $this->couponService->paginate(20, $request->only(['search', 'is_active'])),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Coupon::class);

        return Inertia::render('Admin/Coupons/Form');
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Coupon::class);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code'],
            'type' => ['required', 'in:fixed_cart,percent,fixed_product,free_shipping'],
            'amount' => ['required', 'integer', 'min:0'],
            'min_spend' => ['nullable', 'integer', 'min:0'],
            'max_spend' => ['nullable', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_customer_limit' => ['nullable', 'integer', 'min:1'],
            'individual_use' => ['boolean'],
            'exclude_sale_items' => ['boolean'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ]);

        $data['created_by'] = $request->user()->id;
        $coupon = $this->couponService->create($data);

        return redirect()->route('admin.coupons.index')->with('success', 'Coupon created.');
    }

    public function edit(Coupon $coupon): Response
    {
        $this->authorize('update', $coupon);

        return Inertia::render('Admin/Coupons/Form', ['coupon' => $coupon]);
    }

    public function update(Request $request, Coupon $coupon): RedirectResponse
    {
        $this->authorize('update', $coupon);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:coupons,code,'.$coupon->id],
            'type' => ['required', 'in:fixed_cart,percent,fixed_product,free_shipping'],
            'amount' => ['required', 'integer', 'min:0'],
            'min_spend' => ['nullable', 'integer', 'min:0'],
            'max_spend' => ['nullable', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_customer_limit' => ['nullable', 'integer', 'min:1'],
            'individual_use' => ['boolean'],
            'exclude_sale_items' => ['boolean'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ]);

        $this->couponService->update($coupon, $data);

        return back()->with('success', 'Coupon updated.');
    }

    public function destroy(Coupon $coupon): RedirectResponse
    {
        $this->authorize('delete', $coupon);
        $this->couponService->delete($coupon);

        return redirect()->route('admin.coupons.index')->with('success', 'Coupon deleted.');
    }
}
