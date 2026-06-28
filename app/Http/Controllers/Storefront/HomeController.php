<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        app(StorefrontContext::class)->setFrontPage();

        // Resolve homepage content: look for a published CmsPage with slug "home"
        // or template "home". Falls back to an empty schema if none exists.
        $page = CmsPage::query()
            ->published()
            ->where(function ($q) {
                $q->where('slug', 'home')->orWhere('template', 'home');
            })
            ->first();

        $schema = $page
            ? $page->builderContentOrDefault()
            : ['schemaVersion' => 1, 'components' => []];

        $products = Product::active()
            ->with(['brand', 'images.media'])
            ->orderBy('sort_order')
            ->limit(24)
            ->get();

        $categories = ProductCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        $brands = ProductBrand::query()
            ->where('is_active', true)
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        // D8 — Open Graph / Twitter meta for the homepage.
        $metaTitle = $page !== null ? $page->meta_title : null;
        $metaDescription = $page !== null ? $page->meta_description : null;

        return Inertia::render('Storefront/Home', [
            'schema' => $schema,
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'metaTitle' => $metaTitle,
            'metaDescription' => $metaDescription,
            'meta' => [
                'title' => $metaTitle ?? config('app.name'),
                'description' => $metaDescription,
                'image' => null,
                'canonical' => route('storefront.home'),
            ],
        ]);
    }
}
