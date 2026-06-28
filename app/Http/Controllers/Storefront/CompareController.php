<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductImage;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CompareController extends Controller
{
    // ─── Compare page — GET /compare?ids=1,2,3 ───────────────────────────────
    //
    // The page reads product IDs from localStorage on mount. When IDs differ
    // from the URL, the React page re-navigates to sync them. The controller
    // accepts up to 4 validated IDs and returns the product comparison data.

    public function index(Request $request): Response
    {
        $rawIds = $request->query('ids', '');

        // Validate: a comma-separated string of up to 4 positive integers.
        $ids = $this->parseIds(is_string($rawIds) ? $rawIds : '');

        $products = [];

        if ($ids !== []) {
            $products = Product::whereIn('id', $ids)
                ->where('status', 'active')
                ->with([
                    'images' => fn ($q) => $q->where('is_featured', true)->limit(1),
                    'images.media',
                    'brand',
                    'categories' => fn ($q) => $q->select('product_categories.id', 'product_categories.name'),
                ])
                ->get()
                ->map(fn (Product $p): array => $this->productRow($p))
                ->values()
                ->all();
        }

        return Inertia::render('Storefront/Compare', [
            'products' => $products,
            'ids' => $ids,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Parse and validate a comma-separated list of IDs.
     * Returns up to 4 positive integer IDs, deduplicated.
     *
     * @return list<int>
     */
    private function parseIds(string $raw): array
    {
        if ($raw === '') {
            return [];
        }

        $mapped = array_map(
            fn (string $s): int => (int) trim($s),
            explode(',', $raw, 10),
        );

        $filtered = array_values(array_filter($mapped, fn (int $id): bool => $id > 0));
        $unique = array_values(array_unique($filtered));

        return array_slice($unique, 0, 4);
    }

    /** @return array<string, mixed> */
    private function productRow(Product $p): array
    {
        /** @var ProductImage|null $img */
        $img = $p->images->first();

        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'price' => $p->effective_price,
            'regular_price' => $p->regular_price,
            'sale_price' => $p->sale_price,
            'in_stock' => $p->isInStock(),
            'image_url' => $img !== null ? $img->url : '',
            'image_alt' => $img !== null ? ($img->alt ?? $p->name) : $p->name,
            'brand' => $p->brand?->name,
            'categories' => $p->categories->pluck('name')->all(),
            'sku' => $p->sku,
            'type' => $p->type,
        ];
    }
}
