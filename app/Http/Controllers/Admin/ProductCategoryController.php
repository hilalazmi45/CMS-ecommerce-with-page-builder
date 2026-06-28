<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Catalogue\Services\CategoryService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductCategoryController extends Controller
{
    public function __construct(private CategoryService $categoryService) {}

    public function index(): Response
    {
        $this->authorize('manage_categories', ProductCategory::class);

        return Inertia::render('Admin/ProductCategories/Index', [
            'categories' => $this->categoryService->flat()->load('parent'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage_categories', ProductCategory::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:product_categories,slug'],
            'parent_id' => ['nullable', 'exists:product_categories,id'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $this->categoryService->create($data);

        return back()->with('success', 'Category created.');
    }

    public function update(Request $request, ProductCategory $productCategory): RedirectResponse
    {
        $this->authorize('manage_categories', ProductCategory::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:product_categories,slug,'.$productCategory->id],
            'parent_id' => ['nullable', 'exists:product_categories,id'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $this->categoryService->update($productCategory, $data);

        return back()->with('success', 'Category updated.');
    }

    public function destroy(ProductCategory $productCategory): RedirectResponse
    {
        $this->authorize('manage_categories', ProductCategory::class);
        $this->categoryService->delete($productCategory);

        return back()->with('success', 'Category deleted.');
    }
}
