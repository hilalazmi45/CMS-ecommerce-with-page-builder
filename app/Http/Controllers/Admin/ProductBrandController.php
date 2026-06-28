<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProductBrandController extends Controller
{
    public function index(): Response
    {
        $this->authorize('manage_brands', ProductCategory::class);

        return Inertia::render('Admin/ProductBrands/Index', [
            'brands' => ProductBrand::orderBy('name')->paginate(20),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage_brands', ProductCategory::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:product_brands,slug'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $data['slug'] ??= Str::slug($data['name']);
        $brand = ProductBrand::create($data);
        ActivityLogger::log('catalogue', 'brand_created', ProductBrand::class, $brand->id, null, $brand->toArray());

        return back()->with('success', 'Brand created.');
    }

    public function update(Request $request, ProductBrand $productBrand): RedirectResponse
    {
        $this->authorize('manage_brands', ProductCategory::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:product_brands,slug,'.$productBrand->id],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $old = $productBrand->toArray();
        $productBrand->update($data);
        ActivityLogger::log('catalogue', 'brand_updated', ProductBrand::class, $productBrand->id, $old, $productBrand->toArray());

        return back()->with('success', 'Brand updated.');
    }

    public function destroy(ProductBrand $productBrand): RedirectResponse
    {
        $this->authorize('manage_brands', ProductCategory::class);

        ActivityLogger::log('catalogue', 'brand_deleted', ProductBrand::class, $productBrand->id, $productBrand->toArray(), null);
        $productBrand->delete();

        return back()->with('success', 'Brand deleted.');
    }
}
