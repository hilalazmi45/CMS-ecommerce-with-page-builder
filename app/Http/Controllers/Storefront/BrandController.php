<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\PageBuilder\Services\ConditionResolver;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Route model binding uses {brand:slug} — Laravel resolves by the `slug`
     * column even though getRouteKeyName() returns 'ulid'.
     */
    public function show(ProductBrand $brand, ConditionResolver $conditions): Response
    {
        $context = app(StorefrontContext::class);
        $context->setArchive('product_brand', $brand->id);

        // Eager-load the brand logo
        $brand->load('logo');

        // Products under this brand
        $products = Product::active()
            ->where('brand_id', $brand->id)
            ->with(['brand', 'images.media'])
            ->get();

        $categories = ProductCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        $brands = ProductBrand::query()
            ->where('is_active', true)
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        // Prefer the brand's own builder_content; otherwise fall back to a
        // matching 'archive' theme template resolved by display conditions.
        $own = $brand->builderContentOrDefault();
        $schema = ! empty($own['components'])
            ? $own
            : ($conditions->matchedContent('archive', $context) ?? $own);

        // D8 — Open Graph / Twitter meta for the brand page.
        return Inertia::render('Storefront/Brand', [
            'schema' => $schema,
            'brand' => $brand,
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'meta' => [
                'title' => $brand->name,
                'description' => $brand->description ?? null,
                'image' => $brand->logo?->url() ?? null,
                'canonical' => route('storefront.brand', ['brand' => $brand->slug]),
            ],
        ]);
    }
}
