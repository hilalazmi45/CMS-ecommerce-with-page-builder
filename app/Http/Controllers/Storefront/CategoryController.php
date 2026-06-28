<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\PageBuilder\Services\ConditionResolver;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Route model binding uses {category:slug} — Laravel resolves by the `slug`
     * column even though getRouteKeyName() returns 'ulid'.
     */
    public function show(ProductCategory $category, ConditionResolver $conditions): Response
    {
        $context = app(StorefrontContext::class);
        $context->setArchive('product_category', $category->id);

        // Eager-load the category image
        $category->load('image');

        // Products in this category
        $products = $category->products()
            ->active()
            ->with(['brand', 'images.media'])
            ->orderBy('sort_order')
            ->get();

        $categories = ProductCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        $brands = ProductBrand::query()
            ->where('is_active', true)
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        // Prefer the category's own builder_content; otherwise fall back to a
        // matching 'archive' theme template resolved by display conditions.
        $own = $category->builderContentOrDefault();
        $schema = ! empty($own['components'])
            ? $own
            : ($conditions->matchedContent('archive', $context) ?? $own);

        // D8 — Open Graph / Twitter meta for the category page.
        return Inertia::render('Storefront/Category', [
            'schema' => $schema,
            'category' => $category,
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'meta' => [
                'title' => $category->name,
                'description' => $category->description ?? null,
                'image' => $category->image?->url() ?? null,
                'canonical' => route('storefront.category', ['category' => $category->slug]),
            ],
        ]);
    }
}
