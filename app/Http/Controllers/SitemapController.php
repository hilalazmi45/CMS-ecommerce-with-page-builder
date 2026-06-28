<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/**
 * D8 — Sitemap generator.
 *
 * Returns a standards-compliant XML sitemap listing:
 *   - published CMS pages
 *   - active products (by slug → storefront.product)
 *   - active product categories (by slug → storefront.category)
 *   - active product brands (by slug → storefront.brand)
 *
 * Registered at GET /sitemap.xml BEFORE the catch-all /{slug} route so it
 * is never swallowed by the CMS page resolver.
 *
 * Query discipline: only the columns needed for URL generation and lastmod
 * are selected, avoiding loading builder_content or large text columns.
 */
final class SitemapController extends Controller
{
    public function index(): Response
    {
        $urls = [];

        // ── Published CMS pages ───────────────────────────────────────────────
        CmsPage::query()
            ->published()
            ->select(['slug', 'updated_at'])
            ->orderBy('updated_at', 'desc')
            ->chunk(500, function ($pages) use (&$urls): void {
                foreach ($pages as $page) {
                    $urls[] = [
                        'loc' => route('storefront.cms-page', ['slug' => $page->slug]),
                        'lastmod' => $this->lastmod($page->updated_at),
                    ];
                }
            });

        // ── Active products ───────────────────────────────────────────────────
        Product::query()
            ->active()
            ->select(['slug', 'updated_at'])
            ->orderBy('updated_at', 'desc')
            ->chunk(500, function ($products) use (&$urls): void {
                foreach ($products as $product) {
                    $urls[] = [
                        'loc' => route('storefront.product', ['product' => $product->slug]),
                        'lastmod' => $this->lastmod($product->updated_at),
                    ];
                }
            });

        // ── Active product categories ─────────────────────────────────────────
        ProductCategory::query()
            ->where('is_active', true)
            ->select(['slug', 'updated_at'])
            ->orderBy('updated_at', 'desc')
            ->chunk(200, function ($categories) use (&$urls): void {
                foreach ($categories as $category) {
                    $urls[] = [
                        'loc' => route('storefront.category', ['category' => $category->slug]),
                        'lastmod' => $this->lastmod($category->updated_at),
                    ];
                }
            });

        // ── Active product brands ─────────────────────────────────────────────
        ProductBrand::query()
            ->where('is_active', true)
            ->select(['slug', 'updated_at'])
            ->orderBy('updated_at', 'desc')
            ->chunk(200, function ($brands) use (&$urls): void {
                foreach ($brands as $brand) {
                    $urls[] = [
                        'loc' => route('storefront.brand', ['brand' => $brand->slug]),
                        'lastmod' => $this->lastmod($brand->updated_at),
                    ];
                }
            });

        $xml = $this->buildXml($urls);

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'X-Robots-Tag' => 'noindex',
        ]);
    }

    /**
     * @param  array<int, array{loc: string, lastmod: string}>  $urls
     */
    private function buildXml(array $urls): string
    {
        $entries = '';

        foreach ($urls as $url) {
            $loc = htmlspecialchars($url['loc'], ENT_XML1, 'UTF-8');
            $entries .= "    <url>\n";
            $entries .= "        <loc>{$loc}</loc>\n";
            $entries .= "        <lastmod>{$url['lastmod']}</lastmod>\n";
            $entries .= "    </url>\n";
        }

        return <<<XML
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            {$entries}</urlset>
            XML;
    }

    private function lastmod(mixed $timestamp): string
    {
        if ($timestamp instanceof Carbon) {
            return $timestamp->toDateString();
        }

        if (is_string($timestamp)) {
            return Carbon::parse($timestamp)->toDateString();
        }

        return Carbon::now()->toDateString();
    }
}
