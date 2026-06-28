<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Models;

use App\Domain\Catalogue\Services\CategoryService;
use App\Domain\Media\Models\Media;
use App\Domain\PageBuilder\Concerns\HasPageBuilder;
use App\Http\Middleware\CacheStorefrontPage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductCategory extends Model
{
    use HasFactory, HasPageBuilder;

    protected $table = 'product_categories';

    protected $fillable = [
        'ulid', 'name', 'slug', 'parent_id', 'image_id', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });

        // D6 — Bust the shared category tree cache whenever any category is
        // saved or deleted so stale data is never served to the storefront.
        static::saved(fn () => CategoryService::bustTreeCache());
        static::deleted(fn () => CategoryService::bustTreeCache());

        // D1 — Also bust the storefront page cache so category listing pages
        // reflect the updated data for the next anonymous visitor.
        static::saved(fn () => CacheStorefrontPage::bustAll());
        static::deleted(fn () => CacheStorefrontPage::bustAll());
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    /** @return BelongsTo<self, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<self, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return BelongsTo<Media, $this> */
    public function image(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'image_id');
    }

    /** @return BelongsToMany<Product, $this> */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_category_product');
    }
}
