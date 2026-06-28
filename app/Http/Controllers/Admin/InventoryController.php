<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Domain\Inventory\Services\InventoryService;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(private readonly InventoryService $inventoryService) {}

    public function index(Request $request): Response
    {
        $this->authorize('inventory.view');

        $filters = $request->only(['search', 'low_stock']);

        // Normalise the boolean flag coming from the query string.
        if (isset($filters['low_stock'])) {
            $filters['low_stock'] = filter_var($filters['low_stock'], FILTER_VALIDATE_BOOLEAN);
        }

        return Inertia::render('Admin/Inventory/Index', [
            'rows' => $this->inventoryService->paginateStock($filters),
            'filters' => [
                'search' => $request->query('search', ''),
                'low_stock' => isset($filters['low_stock']) && $filters['low_stock'],
            ],
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $this->authorize('inventory.adjust');

        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'variation_id' => ['nullable', 'integer', 'exists:product_variations,id'],
            'delta' => ['required', 'integer', 'not_in:0'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $product = Product::findOrFail($validated['product_id']);

        /** @var ProductVariation|null $variation */
        $variation = null;
        if (! empty($validated['variation_id'])) {
            $variation = ProductVariation::findOrFail($validated['variation_id']);

            // Assert ownership — variation must belong to the given product.
            abort_if(
                $variation->product_id !== $product->id,
                422,
                'Variation does not belong to the specified product.',
            );
        }

        $this->inventoryService->adjust(
            product: $product,
            quantity: (int) $validated['delta'],
            type: 'adjustment',
            note: $validated['note'] ?? null,
            variation: $variation,
        );

        return back()->with('success', 'Stock adjusted successfully.');
    }
}
