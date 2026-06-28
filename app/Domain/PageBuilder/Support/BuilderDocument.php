<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Support;

use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Models\ThemeTemplate;
use Illuminate\Database\Eloquent\Model;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Single source of truth for the polymorphic page-builder document types.
 *
 * Resolving the owner model for a `{type}` URL segment and deciding which
 * gate ability authorises editing it are shared by both BuilderController and
 * SaveBuilderContentRequest, so they live here to avoid drift between the two.
 */
final class BuilderDocument
{
    /**
     * Document type slug → [owning model class].
     *
     * @var array<string, class-string<Model>>
     */
    public const TYPES = [
        'page' => CmsPage::class,
        'category' => ProductCategory::class,
        'brand' => ProductBrand::class,
        'header' => ThemeTemplate::class,
        'footer' => ThemeTemplate::class,
        'product' => ThemeTemplate::class,
        'theme' => ThemeTemplate::class,
    ];

    /** Theme-type slugs that resolve to ThemeTemplate rows. */
    public const THEME_TYPES = ['header', 'footer', 'product', 'theme'];

    public static function isKnownType(string $type): bool
    {
        return isset(self::TYPES[$type]);
    }

    /**
     * Resolve the owning model for a builder document, or fail with 404.
     */
    public static function resolve(string $type, string $ulid): Model
    {
        if (! self::isKnownType($type)) {
            throw new NotFoundHttpException("Unknown builder document type: {$type}");
        }

        $modelClass = self::TYPES[$type];

        return $modelClass::where('ulid', $ulid)->firstOrFail();
    }

    /**
     * The gate ability + target that authorises editing this document type.
     *
     * CmsPage has a dedicated policy; theme templates re-use the cms update
     * permission (same Content group); category/brand use the catalogue
     * permission. Returns [ability, target] suitable for Gate::authorize()
     * or $user->can().
     *
     * @return array{0: string, 1: Model|class-string}
     */
    public static function gateArguments(string $type, Model $owner): array
    {
        if ($type === 'page') {
            return ['update', $owner];
        }

        if (in_array($type, self::THEME_TYPES, true)) {
            return ['update', CmsPage::firstOrNew()];
        }

        return ['manage_categories', ProductCategory::class];
    }
}
