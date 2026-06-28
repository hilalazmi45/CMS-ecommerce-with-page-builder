<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function searchProduct(array $overrides = []): Product
{
    static $n = 0;
    $n++;

    return Product::create(array_merge([
        'name' => "Search Test Product {$n}",
        'slug' => "search-product-{$n}-".uniqid(),
        'sku' => "SRCH-{$n}-".uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 2500,
        'sale_price' => null,
        'manage_stock' => false,
        'stock_quantity' => null,
        'reserved_quantity' => 0,
        'backorders' => 'no',
        'stock_status' => 'instock',
        'description' => 'A great product for searching.',
        'short_description' => 'Short description.',
    ], $overrides));
}

// ---------------------------------------------------------------------------
// 1. Suggest endpoint — basic matching
// ---------------------------------------------------------------------------

it('suggest returns matching active products as JSON', function () {
    $product = searchProduct(['name' => 'Unique Gadget Widget']);

    $this->getJson('/search/suggest?q=Unique+Gadget')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Unique Gadget Widget'])
        ->assertJsonStructure([
            '*' => ['id', 'name', 'slug', 'price', 'image_url'],
        ]);
});

it('suggest only returns active products', function () {
    searchProduct(['name' => 'Active Visible', 'status' => 'active']);
    searchProduct(['name' => 'Draft Hidden',   'status' => 'draft']);

    $response = $this->getJson('/search/suggest?q=Visible')
        ->assertOk();

    $names = collect($response->json())->pluck('name');
    expect($names)->toContain('Active Visible')
        ->not->toContain('Draft Hidden');
});

it('suggest returns empty array when query is shorter than 2 characters', function () {
    searchProduct(['name' => 'Alpha Product']);

    $this->getJson('/search/suggest?q=A')
        ->assertOk()
        ->assertExactJson([]);
});

it('suggest returns empty array when no products match', function () {
    $this->getJson('/search/suggest?q=ZZZNonExistentXXX')
        ->assertOk()
        ->assertExactJson([]);
});

it('suggest caps results at 8 even when more match', function () {
    foreach (range(1, 12) as $i) {
        searchProduct(['name' => "Bulk Item {$i}"]);
    }

    $response = $this->getJson('/search/suggest?q=Bulk+Item')
        ->assertOk();

    expect(count($response->json()))->toBeLessThanOrEqual(8);
});

it('suggest matches by SKU as well as name', function () {
    $product = searchProduct(['name' => 'Random Name', 'sku' => 'UNIQUESKU-9988']);

    $this->getJson('/search/suggest?q=UNIQUESKU-9988')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Random Name']);
});

// ---------------------------------------------------------------------------
// 2. Search index page
// ---------------------------------------------------------------------------

it('search index page renders the Inertia component', function () {
    $this->get('/search?q=anything')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Storefront/SearchResults'));
});

it('search index passes the query prop', function () {
    $this->get('/search?q=gadget')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/SearchResults')
            ->where('query', 'gadget')
        );
});

it('search index returns matching products in the products prop', function () {
    searchProduct(['name' => 'Findable Widget Pro']);

    $this->get('/search?q=Findable')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/SearchResults')
            ->has('products', fn ($p) => $p->where('0.name', 'Findable Widget Pro')->etc())
        );
});

it('search index excludes inactive products from results', function () {
    searchProduct(['name' => 'Inactive Excluded Product', 'status' => 'draft']);

    $response = $this->get('/search?q=Inactive+Excluded')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Storefront/SearchResults'));

    $products = $response->original->getData()['page']['props']['products'];
    $names = collect($products)->pluck('name');
    expect($names)->not->toContain('Inactive Excluded Product');
});

it('search index returns empty products and null pagination for short query', function () {
    $this->get('/search?q=a')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/SearchResults')
            ->where('products', [])
            ->where('pagination', null)
        );
});

it('search index includes pagination meta when results exist', function () {
    searchProduct(['name' => 'Pageable Product']);

    $this->get('/search?q=Pageable')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/SearchResults')
            ->has('pagination', fn ($p) => $p
                ->has('total')
                ->has('current_page')
                ->has('last_page')
                ->etc()
            )
        );
});

// ---------------------------------------------------------------------------
// 3. Throttle wiring — route exists and accepts typical traffic
// ---------------------------------------------------------------------------

it('suggest route exists and is reachable', function () {
    $this->getJson('/search/suggest?q=test')
        ->assertOk();
});
