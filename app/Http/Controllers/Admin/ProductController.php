<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductAttribute;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Services\CategoryService;
use App\Domain\Catalogue\Services\ProductService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private ProductService $productService,
        private CategoryService $categoryService,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Product::class);

        return Inertia::render('Admin/Products/Index', [
            'products' => $this->productService->paginate(20, $request->only(['search', 'status', 'type', 'category_id'])),
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Product::class);

        return Inertia::render('Admin/Products/Form', [
            'categories' => $this->categoryService->flat(),
            'brands' => ProductBrand::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'attributes' => ProductAttribute::with(['values' => fn ($q) => $q->orderBy('sort_order')])->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Product::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug'],
            'type' => ['required', 'in:simple,variable'],
            'status' => ['required', 'in:draft,active,archived'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku'],
            'regular_price' => ['nullable', 'integer', 'min:0'],
            'sale_price' => ['nullable', 'integer', 'min:0'],
            'manage_stock' => ['boolean'],
            'stock_quantity' => ['nullable', 'integer'],
            'is_featured' => ['boolean'],
            'brand_id' => ['nullable', 'exists:product_brands,id'],
            'category_ids' => ['array'],
            'category_ids.*' => ['exists:product_categories,id'],
            // Gallery — ordered list of media IDs; first becomes featured
            'image_ids' => ['array'],
            'image_ids.*' => ['exists:media,id'],
            // SEO
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'og_image_id' => ['nullable', 'exists:media,id'],
            // Variations (for type=variable)
            'variations' => ['array'],
            'variations.*.attribute_values' => ['required_with:variations', 'array'],
            'variations.*.regular_price' => ['required_with:variations', 'integer', 'min:0'],
            'variations.*.sale_price' => ['nullable', 'integer', 'min:0'],
            'variations.*.sku' => ['nullable', 'string', 'max:100'],
            'variations.*.stock_quantity' => ['nullable', 'integer'],
            'variations.*.manage_stock' => ['boolean'],
            'variations.*.is_active' => ['boolean'],
        ]);

        $data['created_by'] = $request->user()->id;
        $product = $this->productService->create($data);

        return redirect()->route('admin.products.edit', $product->ulid)
            ->with('success', 'Product created.');
    }

    public function edit(Product $product): Response
    {
        $this->authorize('update', $product);

        return Inertia::render('Admin/Products/Form', [
            'product' => $product->load(['categories', 'images.media', 'variations', 'brand']),
            'categories' => $this->categoryService->flat(),
            'brands' => ProductBrand::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'attributes' => ProductAttribute::with(['values' => fn ($q) => $q->orderBy('sort_order')])->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorize('update', $product);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:products,slug,'.$product->id],
            'type' => ['required', 'in:simple,variable'],
            'status' => ['required', 'in:draft,active,archived'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku,'.$product->id],
            'regular_price' => ['nullable', 'integer', 'min:0'],
            'sale_price' => ['nullable', 'integer', 'min:0'],
            'manage_stock' => ['boolean'],
            'stock_quantity' => ['nullable', 'integer'],
            'is_featured' => ['boolean'],
            'brand_id' => ['nullable', 'exists:product_brands,id'],
            'category_ids' => ['array'],
            'category_ids.*' => ['exists:product_categories,id'],
            'image_ids' => ['array'],
            'image_ids.*' => ['exists:media,id'],
            // SEO
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'og_image_id' => ['nullable', 'exists:media,id'],
            // Variations
            'variations' => ['array'],
            'variations.*.ulid' => ['nullable', 'string'],
            'variations.*.attribute_values' => ['required_with:variations', 'array'],
            'variations.*.regular_price' => ['required_with:variations', 'integer', 'min:0'],
            'variations.*.sale_price' => ['nullable', 'integer', 'min:0'],
            'variations.*.sku' => ['nullable', 'string', 'max:100'],
            'variations.*.stock_quantity' => ['nullable', 'integer'],
            'variations.*.manage_stock' => ['boolean'],
            'variations.*.is_active' => ['boolean'],
        ]);

        $this->productService->update($product, $data);

        return back()->with('success', 'Product updated.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $this->authorize('delete', $product);
        $this->productService->delete($product);

        return redirect()->route('admin.products.index')->with('success', 'Product deleted.');
    }
}
