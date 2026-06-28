<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\PageBuilder\Models\ThemeTemplate;
use Illuminate\Support\Str;

function makeStorefrontProduct(array $overrides = []): Product
{
    return Product::create(array_merge([
        'name' => 'Template Product',
        'slug' => 'tpl-product-'.uniqid(),
        'sku' => 'TPL-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'manage_stock' => false,
        'stock_quantity' => 0,
        'reserved_quantity' => 0,
        'backorders' => 'no',
    ], $overrides));
}

function makeThemeTemplate(string $type, array $components, ?array $conditions): ThemeTemplate
{
    return ThemeTemplate::create([
        'ulid' => Str::ulid()->toString(),
        'name' => ucfirst($type).' '.uniqid(),
        'type' => $type,
        'content' => ['schemaVersion' => 1, 'components' => $components],
        'conditions' => $conditions,
        'is_active' => true,
    ]);
}

function heading(string $id, string $text): array
{
    return ['id' => $id, 'type' => 'heading', 'version' => 1, 'settings' => ['text' => $text], 'styles' => []];
}

it('renders the entire-site product template on a product page', function () {
    $product = makeStorefrontProduct();
    makeThemeTemplate('product', [heading('h-site', 'Default Product Layout')], [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $this->get(route('storefront.product', $product->slug))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Product')
            ->where('schema.components.0.settings.text', 'Default Product Layout'));
});

it('prefers a product-specific template over the entire-site one', function () {
    $product = makeStorefrontProduct();
    $other = makeStorefrontProduct();

    makeThemeTemplate('product', [heading('h-site', 'Generic')], [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);
    makeThemeTemplate('product', [heading('h-specific', 'Special Layout')], [
        ['mode' => 'include', 'rule' => 'singular:product:'.$product->id],
    ]);

    // The targeted product gets the specific layout…
    $this->get(route('storefront.product', $product->slug))
        ->assertInertia(fn ($page) => $page->where('schema.components.0.settings.text', 'Special Layout'));

    // …while a different product still gets the generic one.
    $this->get(route('storefront.product', $other->slug))
        ->assertInertia(fn ($page) => $page->where('schema.components.0.settings.text', 'Generic'));
});

it('falls back to an archive template when a category has no own content', function () {
    $category = ProductCategory::create([
        'name' => 'Gadgets',
        'slug' => 'gadgets-'.uniqid(),
        'is_active' => true,
    ]);

    makeThemeTemplate('archive', [heading('h-arch', 'Archive Layout')], [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $this->get(route('storefront.category', $category->slug))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Storefront/Category')
            ->where('schema.components.0.settings.text', 'Archive Layout'));
});

it('uses the category own content over the archive template when present', function () {
    $category = ProductCategory::create([
        'name' => 'Owned',
        'slug' => 'owned-'.uniqid(),
        'is_active' => true,
        'builder_content' => ['schemaVersion' => 1, 'components' => [heading('h-own', 'Own Category Layout')]],
    ]);

    makeThemeTemplate('archive', [heading('h-arch', 'Archive Layout')], [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $this->get(route('storefront.category', $category->slug))
        ->assertInertia(fn ($page) => $page->where('schema.components.0.settings.text', 'Own Category Layout'));
});
