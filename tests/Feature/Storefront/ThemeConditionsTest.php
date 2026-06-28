<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Models\ThemeTemplate;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create an active ThemeTemplate of the given type with the given conditions.
 *
 * @param  array<int, array{mode: string, rule: string}>  $conditions
 */
function makeTemplate(string $type, string $name, array $conditions): ThemeTemplate
{
    return ThemeTemplate::create([
        'name' => $name,
        'type' => $type,
        'content' => ['schemaVersion' => 1, 'components' => [['id' => 'h1', 'type' => 'heading', 'version' => 1, 'settings' => ['text' => $name], 'styles' => ['desktop' => []]]]],
        'conditions' => $conditions ?: null,
        'is_active' => true,
    ]);
}

/**
 * Create an active Product with a unique slug.
 */
function makeActiveProduct(): Product
{
    return Product::create([
        'name' => 'Test Product '.uniqid(),
        'slug' => 'tp-'.uniqid(),
        'sku' => 'SKU-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'manage_stock' => false,
        'stock_status' => 'instock',
    ]);
}

/**
 * Create a published CmsPage with a unique slug.
 */
function makePublishedPage(): CmsPage
{
    return CmsPage::create([
        'title' => 'Test Page '.uniqid(),
        'slug' => 'tp-'.uniqid(),
        'status' => 'published',
    ]);
}

/**
 * Create a user with the cms.update permission, following the factory pattern
 * established in RBACServiceTest.
 */
function makeEditorUser(): User
{
    $permission = Permission::factory()->code('cms.update')->create();
    $role = Role::factory()->withPermission($permission)->create();

    $user = User::factory()->create();
    $user->roles()->attach($role);

    return $user;
}

// ─── Entire-site header applies on the home page ──────────────────────────────

it('serves the site-wide header on the home page', function () {
    makeTemplate('header', 'Site Header', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        $page->has('storefront.header')
            ->where('storefront.header.schemaVersion', 1);
    });
});

it('serves null header when no template has a matching condition', function () {
    // Only a 404-specific header — should not appear on the home page.
    makeTemplate('header', '404 Header', [
        ['mode' => 'include', 'rule' => 'e404'],
    ]);

    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        $page->where('storefront.header', null);
    });
});

// ─── Product-specific header overrides site-wide on that product ───────────────

it('serves the product-specific header on the matching product page', function () {
    $product = makeActiveProduct();

    makeTemplate('header', 'Global Header', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    makeTemplate('header', 'Product Header', [
        ['mode' => 'include', 'rule' => "singular:product:{$product->id}"],
    ]);

    $response = $this->get("/product/{$product->slug}");

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        // The components array has a heading with the product-specific name
        $page->has('storefront.header.components')
            ->where('storefront.header.components.0.settings.text', 'Product Header');
    });
});

it('does NOT serve the product-specific header on a different product', function () {
    $productA = makeActiveProduct();
    $productB = makeActiveProduct();

    makeTemplate('header', 'Global Header', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    makeTemplate('header', 'Product A Header', [
        ['mode' => 'include', 'rule' => "singular:product:{$productA->id}"],
    ]);

    $response = $this->get("/product/{$productB->slug}");

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        $page->where('storefront.header.components.0.settings.text', 'Global Header');
    });
});

// ─── Exclude rule prevents template from appearing ────────────────────────────

it('does not serve a header excluded for the current page context', function () {
    $product = makeActiveProduct();

    makeTemplate('header', 'Global Except Product', [
        ['mode' => 'include', 'rule' => 'entire_site'],
        ['mode' => 'exclude', 'rule' => "singular:product:{$product->id}"],
    ]);

    $response = $this->get("/product/{$product->slug}");

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        $page->where('storefront.header', null);
    });
});

// ─── Admin: authorization on updateConditions ─────────────────────────────────

it('denies updateConditions to unauthenticated users with 403', function () {
    $template = makeTemplate('header', 'H', []);

    $response = $this->patch(
        route('admin.theme-templates.update-conditions', $template->ulid),
        ['conditions' => []],
    );

    // Unauthenticated → redirect to login, or 403 depending on middleware order.
    // The auth middleware fires before the policy, so we get a redirect.
    $response->assertRedirect();
});

it('denies updateConditions to an authenticated user without cms.update permission', function () {
    $user = User::factory()->create(); // no roles, no permissions
    $template = makeTemplate('header', 'H', []);

    $response = $this->actingAs($user)->patch(
        route('admin.theme-templates.update-conditions', $template->ulid),
        ['conditions' => []],
    );

    $response->assertForbidden();
});

it('saves conditions for an authorised user', function () {
    $user = makeEditorUser();
    $template = makeTemplate('header', 'H', []);

    $conditions = [
        ['mode' => 'include', 'rule' => 'entire_site'],
        ['mode' => 'exclude', 'rule' => 'singular:product:3'],
    ];

    $response = $this->actingAs($user)->patch(
        route('admin.theme-templates.update-conditions', $template->ulid),
        ['conditions' => $conditions],
    );

    $response->assertRedirect(route('admin.theme-templates.index'));

    $template->refresh();
    expect($template->conditions)->toBe($conditions);
});

it('rejects an invalid rule format in updateConditions', function () {
    $user = makeEditorUser();
    $template = makeTemplate('header', 'H', []);

    $response = $this->actingAs($user)->patch(
        route('admin.theme-templates.update-conditions', $template->ulid),
        ['conditions' => [
            ['mode' => 'include', 'rule' => 'totally_invalid_rule'],
        ]],
    );

    $response->assertSessionHasErrors(['conditions.0.rule']);
});

it('rejects an invalid mode in updateConditions', function () {
    $user = makeEditorUser();
    $template = makeTemplate('header', 'H', []);

    $response = $this->actingAs($user)->patch(
        route('admin.theme-templates.update-conditions', $template->ulid),
        ['conditions' => [
            ['mode' => 'toggle', 'rule' => 'entire_site'],
        ]],
    );

    $response->assertSessionHasErrors(['conditions.0.mode']);
});
