<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\Product;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    /**
     * AJAX autocomplete suggestions — returns up to 8 active products matching
     * name or SKU. Rate-limited at 60 req/min via route definition.
     */
    public function suggest(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $term = '%'.addcslashes($q, '%_\\').'%';

        $results = Product::query()
            ->where('status', 'active')
            ->where(function ($query) use ($term): void {
                $query->where('name', 'LIKE', $term)
                    ->orWhere('sku', 'LIKE', $term);
            })
            ->with(['images' => fn ($q) => $q->where('is_featured', true)->limit(1)])
            ->select(['id', 'ulid', 'name', 'slug', 'regular_price', 'sale_price'])
            ->limit(8)
            ->get()
            ->map(function (Product $p): array {
                $image = $p->images->first();
                $price = $p->sale_price ?? $p->regular_price;

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'price' => $price,
                    'image_url' => $image?->url,
                ];
            });

        return response()->json($results);
    }

    /**
     * Full search results page — paginated list of active products matching the
     * query in name, SKU, or description.
     */
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        $products = collect();
        $paginator = null;

        if (mb_strlen($q) >= 2) {
            $term = '%'.addcslashes($q, '%_\\').'%';

            $paginator = Product::query()
                ->where('status', 'active')
                ->where(function ($query) use ($term): void {
                    $query->where('name', 'LIKE', $term)
                        ->orWhere('sku', 'LIKE', $term)
                        ->orWhere('description', 'LIKE', $term)
                        ->orWhere('short_description', 'LIKE', $term);
                })
                ->with(['images' => fn ($q) => $q->where('is_featured', true)->limit(1), 'brand'])
                ->select(['id', 'ulid', 'name', 'slug', 'regular_price', 'sale_price', 'stock_status', 'is_featured', 'brand_id'])
                ->orderByDesc('created_at')
                ->paginate(16)
                ->withQueryString();

            $products = $paginator->getCollection()->map(fn (Product $p): array => [
                'id' => $p->id,
                'ulid' => $p->ulid,
                'name' => $p->name,
                'slug' => $p->slug,
                'regular_price' => $p->regular_price,
                'sale_price' => $p->sale_price,
                'stock_status' => $p->stock_status,
                'is_featured' => (bool) $p->is_featured,
                'brand' => $p->brand ? ['name' => $p->brand->name, 'slug' => $p->brand->slug] : null,
                'images' => $p->images->map(fn ($img) => [
                    'url' => $img->url,
                    'alt' => $img->alt,
                    'is_featured' => (bool) $img->is_featured,
                ])->values()->all(),
                'variations' => [],
                'categories' => [],
            ]);
        }

        return Inertia::render('Storefront/SearchResults', [
            'query' => $q,
            'products' => $products->values(),
            'pagination' => $paginator ? [
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'next_page_url' => $paginator->nextPageUrl(),
                'prev_page_url' => $paginator->previousPageUrl(),
            ] : null,
        ]);
    }
}
