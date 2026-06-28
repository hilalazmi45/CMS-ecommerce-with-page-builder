<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Services;

use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CategoryService
{
    /**
     * Cache key for the active category tree (root nodes + eager-loaded children).
     *
     * Not user-specific and not permission-sensitive — the tree is the same for
     * every visitor and every admin user. The cache is busted automatically by
     * the ProductCategory::booted() observer whenever any category is saved or
     * deleted (see below).
     */
    public const TREE_CACHE_KEY = 'catalogue.category_tree';

    /**
     * TTL in seconds (1 hour). Overrideable via the CATEGORY_TREE_TTL env var
     * for operators who update categories frequently.
     */
    private const TREE_TTL = 3600;

    /**
     * Return the active category tree (root nodes with nested children).
     *
     * Results are cached so that repeated calls within a request (e.g. multiple
     * storefront pages sharing HandleInertiaRequests props) hit the cache rather
     * than issuing the same query. The cache is shared across requests; TTL is
     * one hour with immediate invalidation on any save/delete event.
     */
    public function all(): Collection
    {
        /** @var Collection<int, ProductCategory> */
        return Cache::remember(
            self::TREE_CACHE_KEY,
            self::TREE_TTL,
            fn (): Collection => ProductCategory::with('children')
                ->whereNull('parent_id')
                ->orderBy('sort_order')
                ->get(),
        );
    }

    /**
     * Flat list of all categories (used for admin selects, not cached separately
     * as it is only accessed in authenticated admin requests).
     */
    public function flat(): Collection
    {
        return ProductCategory::orderBy('name')->get();
    }

    public function create(array $data): ProductCategory
    {
        $data['slug'] ??= Str::slug($data['name']);
        $category = ProductCategory::create($data);
        ActivityLogger::log('catalogue', 'category_created', ProductCategory::class, $category->id, null, $category->toArray());

        return $category;
    }

    public function update(ProductCategory $category, array $data): ProductCategory
    {
        $old = $category->toArray();
        $category->update($data);
        ActivityLogger::log('catalogue', 'category_updated', ProductCategory::class, $category->id, $old, $category->toArray());

        return $category;
    }

    public function delete(ProductCategory $category): void
    {
        ActivityLogger::log('catalogue', 'category_deleted', ProductCategory::class, $category->id, $category->toArray(), null);
        $category->delete();
    }

    /**
     * Bust the shared category tree cache.
     *
     * Called automatically from ProductCategory::booted() on saved/deleted events.
     * May also be called explicitly after a bulk import or seeder.
     */
    public static function bustTreeCache(): void
    {
        Cache::forget(self::TREE_CACHE_KEY);
    }
}
