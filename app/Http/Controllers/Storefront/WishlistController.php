<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Catalogue\Models\ProductImage;
use App\Domain\Customers\Models\Wishlist;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\ToggleWishlistRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WishlistController extends Controller
{
    // ─── Wishlist index — GET /my-account/wishlist ────────────────────────────

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $rows = Wishlist::where('user_id', $user->id)
            ->with([
                'product' => fn ($q) => $q->select([
                    'id', 'ulid', 'name', 'slug', 'type', 'status',
                    'regular_price', 'sale_price', 'sale_price_from', 'sale_price_to',
                    'manage_stock', 'stock_quantity', 'reserved_quantity', 'stock_status',
                ]),
                'product.images' => fn ($q) => $q->where('is_featured', true)->limit(1),
                'product.images.media',
            ])
            ->latest('created_at')
            ->get()
            ->filter(fn (Wishlist $w) => $w->product !== null && $w->product->status === 'active')
            ->map(fn (Wishlist $w): array => $this->wishlistRow($w))
            ->values();

        return Inertia::render('Storefront/Account/Wishlist', [
            'items' => $rows,
        ]);
    }

    // ─── Toggle — POST /wishlist/toggle ───────────────────────────────────────

    public function toggle(ToggleWishlistRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $productId = $request->integer('product_id');
        $variationId = $request->filled('variation_id')
            ? $request->integer('variation_id')
            : null;

        $existing = Wishlist::where('user_id', $user->id)
            ->where('product_id', $productId)
            ->where('variation_id', $variationId)
            ->first();

        if ($existing !== null) {
            $existing->delete();

            return back()->with('success', 'Removed from wishlist.');
        }

        Wishlist::create([
            'user_id' => $user->id,
            'product_id' => $productId,
            'variation_id' => $variationId,
        ]);

        return back()->with('success', 'Added to wishlist.');
    }

    // ─── Remove specific row — DELETE /my-account/wishlist/{wishlist} ─────────

    public function destroy(Request $request, Wishlist $wishlist): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_if($wishlist->user_id !== $user->id, 403);

        $wishlist->delete();

        return back()->with('success', 'Removed from wishlist.');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** @return array<string, mixed> */
    private function wishlistRow(Wishlist $w): array
    {
        $product = $w->product;

        /** @var ProductImage|null $img */
        $img = $product->images->first();

        return [
            'wishlist_id' => $w->id,
            'product_id' => $product->id,
            'variation_id' => $w->variation_id,
            'name' => $product->name,
            'slug' => $product->slug,
            'price' => $product->effective_price,
            'regular_price' => $product->regular_price,
            'in_stock' => $product->isInStock(),
            'image_url' => $img !== null ? $img->url : '',
            'image_alt' => $img !== null ? ($img->alt ?? $product->name) : $product->name,
        ];
    }
}
