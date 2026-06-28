<?php

declare(strict_types=1);

use App\Domain\PageBuilder\Models\ThemeTemplate;
use App\Domain\PageBuilder\Services\ConditionResolver;
use App\Domain\PageBuilder\Support\StorefrontContext;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an active header ThemeTemplate with the given conditions array.
 *
 * @param  array<int, array{mode: string, rule: string}>  $conditions
 */
function makeHeader(string $name, array $conditions = [], bool $active = true): ThemeTemplate
{
    return ThemeTemplate::create([
        'name' => $name,
        'type' => 'header',
        'content' => ['schemaVersion' => 1, 'components' => []],
        'conditions' => $conditions ?: null,
        'is_active' => $active,
    ]);
}

function resolver(): ConditionResolver
{
    return new ConditionResolver;
}

// ─── NULL / empty conditions → site-wide include ─────────────────────────────

it('resolves a header with null conditions as site-wide on the front page', function () {
    $template = makeHeader('Global Header');
    $ctx = new StorefrontContext;
    $ctx->setFrontPage();

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($template->id);
});

it('resolves a header with empty-array conditions as site-wide on any context', function () {
    $template = makeHeader('Global Header', []);
    $ctx = new StorefrontContext; // default (unset)

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($template->id);
});

// ─── No match → null ─────────────────────────────────────────────────────────

it('returns null when no active template exists for the type', function () {
    // No footer templates in DB
    $ctx = new StorefrontContext;
    $ctx->setFrontPage();

    $resolved = resolver()->resolve('footer', $ctx);

    expect($resolved)->toBeNull();
});

it('returns null when the only template is inactive', function () {
    makeHeader('Inactive', conditions: [], active: false);
    $ctx = new StorefrontContext;

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved)->toBeNull();
});

// ─── Specificity: exact id > wildcard > front_page > entire_site ─────────────

it('prefers a product-specific header over entire_site on a matching product page', function () {
    $global = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $specific = makeHeader('Product #5 Header', [
        ['mode' => 'include', 'rule' => 'singular:product:5'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 5);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($specific->id);
});

it('falls back to entire_site header on a product page that has no specific header', function () {
    $global = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 99);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($global->id);
});

it('prefers wildcard entity over entire_site', function () {
    $global = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $anyProduct = makeHeader('Any Product', [
        ['mode' => 'include', 'rule' => 'singular:product'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 7);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($anyProduct->id);
});

it('prefers exact id over wildcard entity', function () {
    $wildcard = makeHeader('Any Product', [
        ['mode' => 'include', 'rule' => 'singular:product'],
    ]);

    $exact = makeHeader('Product #3', [
        ['mode' => 'include', 'rule' => 'singular:product:3'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 3);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($exact->id);
});

it('prefers front_page over entire_site on the homepage', function () {
    $global = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $homepageOnly = makeHeader('Homepage Header', [
        ['mode' => 'include', 'rule' => 'front_page'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setFrontPage();

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($homepageOnly->id);
});

// ─── Exclude rules ────────────────────────────────────────────────────────────

it('excludes a template when an exclude rule matches the current context', function () {
    $withExclude = makeHeader('Global except product 5', [
        ['mode' => 'include', 'rule' => 'entire_site'],
        ['mode' => 'exclude', 'rule' => 'singular:product:5'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 5);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved)->toBeNull();
});

it('does not exclude a template when the exclude rule does not match', function () {
    $template = makeHeader('Global except product 5', [
        ['mode' => 'include', 'rule' => 'entire_site'],
        ['mode' => 'exclude', 'rule' => 'singular:product:5'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setSingular('product', 9);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($template->id);
});

// ─── Archive rules ────────────────────────────────────────────────────────────

it('resolves a category-archive-specific header on a category page', function () {
    $global = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $catHeader = makeHeader('Category Archive', [
        ['mode' => 'include', 'rule' => 'archive:product_category:3'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setArchive('product_category', 3);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($catHeader->id);
});

it('does not apply a category header on a different category', function () {
    $catHeader = makeHeader('Category #3 only', [
        ['mode' => 'include', 'rule' => 'archive:product_category:3'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setArchive('product_category', 8);

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved)->toBeNull();
});

// ─── 404 rule ─────────────────────────────────────────────────────────────────

it('resolves an e404 header on the not-found page', function () {
    $notFoundHeader = makeHeader('404 Header', [
        ['mode' => 'include', 'rule' => 'e404'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setNotFound();

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved?->id)->toBe($notFoundHeader->id);
});

it('does not apply the e404 header on a non-404 page', function () {
    makeHeader('404 Header', [
        ['mode' => 'include', 'rule' => 'e404'],
    ]);

    $ctx = new StorefrontContext;
    $ctx->setFrontPage();

    $resolved = resolver()->resolve('header', $ctx);

    expect($resolved)->toBeNull();
});

// ─── matchedContent convenience ───────────────────────────────────────────────

it('returns the content array via matchedContent when a template matches', function () {
    $template = makeHeader('Global', [
        ['mode' => 'include', 'rule' => 'entire_site'],
    ]);

    $ctx = new StorefrontContext;

    $content = resolver()->matchedContent('header', $ctx);

    expect($content)->toBe($template->content);
});

it('returns null from matchedContent when nothing matches', function () {
    $ctx = new StorefrontContext;
    // no templates in DB

    $content = resolver()->matchedContent('footer', $ctx);

    expect($content)->toBeNull();
});
