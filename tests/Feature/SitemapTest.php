<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;

/**
 * D8 — Sitemap tests.
 *
 * Verifies that GET /sitemap.xml returns:
 *   - HTTP 200 with application/xml content-type
 *   - URLs for published CmsPages, active Products, active Categories, active Brands
 *   - Does NOT include draft/inactive records
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCmsPage(array $overrides = []): CmsPage
{
    return CmsPage::create(array_merge([
        'title' => 'Test Page',
        'slug' => 'test-page-'.uniqid(),
        'status' => 'published',
        'published_at' => now(),
        'builder_content' => ['schemaVersion' => 1, 'components' => []],
    ], $overrides));
}

function makeSitemapProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Test Product',
        'slug' => 'test-product-'.uniqid(),
        'sku' => 'SKU-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'manage_stock' => false,
        'stock_status' => 'instock',
    ], $overrides));
}

function makeSitemapCategory(array $overrides = []): ProductCategory
{
    return ProductCategory::create(array_merge([
        'name' => 'Test Category',
        'slug' => 'test-cat-'.uniqid(),
        'is_active' => true,
    ], $overrides));
}

function makeSitemapBrand(array $overrides = []): ProductBrand
{
    return ProductBrand::create(array_merge([
        'name' => 'Test Brand',
        'slug' => 'test-brand-'.uniqid(),
        'is_active' => true,
    ], $overrides));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

it('returns 200 with application/xml content-type', function (): void {
    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->headers->get('Content-Type'))->toContain('application/xml');
});

it('includes a published cms page URL in the sitemap', function (): void {
    $page = makeCmsPage(['slug' => 'about-us']);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->toContain(
        route('storefront.cms-page', ['slug' => $page->slug])
    );
});

it('excludes a draft cms page from the sitemap', function (): void {
    $draft = makeCmsPage(['slug' => 'draft-page', 'status' => 'draft', 'published_at' => null]);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->not->toContain(
        route('storefront.cms-page', ['slug' => $draft->slug])
    );
});

it('includes an active product URL in the sitemap', function (): void {
    $product = makeSitemapProduct(['slug' => 'active-widget']);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->toContain(
        route('storefront.product', ['product' => $product->slug])
    );
});

it('excludes an inactive product from the sitemap', function (): void {
    $inactive = makeSitemapProduct(['slug' => 'inactive-widget', 'status' => 'inactive']);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->not->toContain(
        route('storefront.product', ['product' => $inactive->slug])
    );
});

it('includes an active category URL in the sitemap', function (): void {
    $category = makeSitemapCategory(['slug' => 'electronics']);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->toContain(
        route('storefront.category', ['category' => $category->slug])
    );
});

it('excludes an inactive category from the sitemap', function (): void {
    $inactive = makeSitemapCategory(['slug' => 'old-stuff', 'is_active' => false]);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->not->toContain(
        route('storefront.category', ['category' => $inactive->slug])
    );
});

it('includes an active brand URL in the sitemap', function (): void {
    $brand = makeSitemapBrand(['slug' => 'acme-corp']);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->toContain(
        route('storefront.brand', ['brand' => $brand->slug])
    );
});

it('excludes an inactive brand from the sitemap', function (): void {
    $inactive = makeSitemapBrand(['slug' => 'retired-brand', 'is_active' => false]);

    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    expect($response->getContent())->not->toContain(
        route('storefront.brand', ['brand' => $inactive->slug])
    );
});

it('returns valid xml with a urlset root element', function (): void {
    $response = $this->get('/sitemap.xml');

    $response->assertStatus(200);
    $content = $response->getContent();
    expect($content)
        ->toContain('<?xml')
        ->toContain('<urlset')
        ->toContain('</urlset>');
});
