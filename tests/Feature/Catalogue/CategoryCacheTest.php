<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Catalogue\Services\CategoryService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

// ─── Category tree is cached ──────────────────────────────────────────────────

it('caches the category tree on first call and reuses it on subsequent calls', function (): void {
    // Arrange — two root categories
    ProductCategory::create(['name' => 'Alpha', 'slug' => 'alpha', 'sort_order' => 1]);
    ProductCategory::create(['name' => 'Beta', 'slug' => 'beta', 'sort_order' => 2]);

    $service = new CategoryService;

    // Warm the cache
    $first = $service->all();

    // Count queries on second call — should be zero (cache hit)
    DB::enableQueryLog();
    $second = $service->all();
    $log = DB::getQueryLog();
    DB::disableQueryLog();

    expect($log)->toBeEmpty('second call should be served from cache with no SQL queries')
        ->and($second->count())->toBe($first->count());
});

// ─── saved() busts the cache ─────────────────────────────────────────────────

it('busts the category tree cache when a category is saved', function (): void {
    $cat = ProductCategory::create(['name' => 'Gamma', 'slug' => 'gamma']);
    $service = new CategoryService;

    // Warm the cache
    $service->all();
    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeTrue();

    // Saving the category must invalidate the cache
    $cat->update(['name' => 'Gamma Updated']);

    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeFalse();

    // The next call re-queries and reflects the updated name
    $tree = $service->all();
    expect($tree->first()?->name)->toBe('Gamma Updated');
});

// ─── deleted() busts the cache ───────────────────────────────────────────────

it('busts the category tree cache when a category is deleted', function (): void {
    $cat = ProductCategory::create(['name' => 'Delta', 'slug' => 'delta']);
    $service = new CategoryService;

    // Warm the cache
    $service->all();
    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeTrue();

    // Deleting must invalidate the cache
    $cat->delete();

    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeFalse();

    // After deletion the category no longer appears in the tree
    $names = $service->all()->pluck('name')->all();
    expect($names)->not->toContain('Delta');
});

// ─── bustTreeCache() can be called explicitly ─────────────────────────────────

it('allows explicit cache bust via CategoryService::bustTreeCache()', function (): void {
    ProductCategory::create(['name' => 'Epsilon', 'slug' => 'epsilon']);
    $service = new CategoryService;

    $service->all(); // warm
    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeTrue();

    CategoryService::bustTreeCache();
    expect(Cache::has(CategoryService::TREE_CACHE_KEY))->toBeFalse();
});

// ─── eager-load / N+1 guard ──────────────────────────────────────────────────

it('loads the category tree with children in a bounded number of queries', function (): void {
    // A root with two children.
    $root = ProductCategory::create(['name' => 'Root', 'slug' => 'root']);
    ProductCategory::create(['name' => 'Child A', 'slug' => 'child-a', 'parent_id' => $root->id]);
    ProductCategory::create(['name' => 'Child B', 'slug' => 'child-b', 'parent_id' => $root->id]);

    Cache::forget(CategoryService::TREE_CACHE_KEY); // start cold
    DB::enableQueryLog();
    (new CategoryService)->all();
    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    // With eager-loading (with('children')) the ORM issues at most 2 queries
    // regardless of tree size: one for roots, one for all children.
    expect($queryCount)->toBeLessThanOrEqual(2);
});
