<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Catalogue\Services\ReviewService;
use App\Domain\PageBuilder\Services\ConditionResolver;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function show(Product $product, ConditionResolver $conditions, ReviewService $reviewService): Response
    {
        $context = app(StorefrontContext::class);
        $context->setSingular('product', $product->id);

        // Eager-load relations needed on the product page
        $product->load(['brand', 'categories', 'images.media', 'variations.image', 'ogImage']);

        // Resolve the best-matching product (or single) theme template by its
        // display conditions, falling back to an empty schema.
        $schema = $conditions->matchedContent('product', $context)
            ?? $conditions->matchedContent('single', $context)
            ?? ['schemaVersion' => 1, 'components' => []];

        // Sidebar/related data: featured products (limit 8), all active categories + brands
        $products = Product::active()
            ->featured()
            ->with(['brand', 'images.media'])
            ->limit(8)
            ->get();

        $categories = ProductCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        $brands = ProductBrand::query()
            ->where('is_active', true)
            ->get(['id', 'ulid', 'name', 'slug', 'is_active']);

        // Reviews — only approved, limited to 20 most recent, with summary.
        $reviews = $product->approvedReviews()->limit(20)->get()->map(fn ($r) => [
            'id' => $r->id,
            'ulid' => $r->ulid,
            'author_name' => $r->author_name,
            'rating' => $r->rating,
            'title' => $r->title,
            'body' => $r->body,
            'is_verified_purchase' => $r->is_verified_purchase,
            'created_at' => $r->created_at?->toDateString(),
        ])->values();

        $reviewSummary = $reviewService->summary($product);

        // Build a typed variations payload for the storefront (active variations only).
        $variations = $product->variations()
            ->where('is_active', true)
            ->with('image')
            ->get()
            ->map(fn (ProductVariation $v): array => [
                'id' => $v->id,
                'sku' => $v->sku ?? '',
                'regular_price' => $v->regular_price,
                'sale_price' => $v->sale_price,
                'stock_status' => $v->isInStock() ? 'instock' : 'outofstock',
                'manage_stock' => $v->manage_stock,
                'stock_quantity' => $v->stock_quantity,
                'attribute_values' => $v->attribute_values ?? [],
                'image_url' => $v->image?->url(),
            ])
            ->values();

        // D8 — Open Graph / Twitter meta for the product page.
        // Prefer explicit meta_title/meta_description; fall back to product name/description.
        // For og:image, prefer the dedicated og_image, then the first product image.
        $ogImageUrl = $product->ogImage?->url()
            ?? $product->images->first()?->media?->url();

        return Inertia::render('Storefront/Product', [
            'schema' => $schema,
            'product' => $product,
            'variations' => $variations,
            'products' => $products,
            'categories' => $categories,
            'brands' => $brands,
            'reviews' => $reviews,
            'reviewSummary' => $reviewSummary,
            'meta' => [
                'title' => $product->meta_title ?? $product->name,
                'description' => $product->meta_description ?? $product->short_description ?? null,
                'image' => $ogImageUrl,
                'canonical' => route('storefront.product', ['product' => $product->slug]),
            ],
        ]);
    }
}
