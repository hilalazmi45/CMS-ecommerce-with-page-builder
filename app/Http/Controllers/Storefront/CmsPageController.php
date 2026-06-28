<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Support\StorefrontContext;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class CmsPageController extends Controller
{
    /**
     * Catch-all CMS page renderer.
     *
     * The route uses a plain `{slug}` parameter (not model binding) because
     * CmsPage::getRouteKeyName() returns 'ulid', so `{cmsPage:slug}` would
     * need a custom binding. Manual lookup keeps things explicit and allows us
     * to return a clean 404 when the slug doesn't match any published page.
     */
    public function show(string $slug): Response
    {
        $page = CmsPage::query()
            ->published()
            ->where('slug', $slug)
            ->firstOrFail();

        app(StorefrontContext::class)->setSingular('cms_page', $page->id);

        // D8 — Open Graph / Twitter meta for CMS pages.
        return Inertia::render('Storefront/Page', [
            'schema' => $page->builderContentOrDefault(),
            'title' => $page->title,
            'metaTitle' => $page->meta_title,
            'metaDescription' => $page->meta_description,
            'meta' => [
                'title' => $page->meta_title ?? $page->title,
                'description' => $page->meta_description ?? null,
                'image' => null,
                'canonical' => route('storefront.cms-page', ['slug' => $page->slug]),
            ],
        ]);
    }
}
