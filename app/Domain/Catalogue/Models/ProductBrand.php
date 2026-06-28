<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Models;

use App\Domain\Media\Models\Media;
use App\Domain\PageBuilder\Concerns\HasPageBuilder;
use App\Http\Middleware\CacheStorefrontPage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ProductBrand extends Model
{
    use HasFactory, HasPageBuilder;

    protected $table = 'product_brands';

    protected $fillable = [
        'ulid', 'name', 'slug', 'description', 'logo_id', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });

        // D1 — Brand saves/deletes affect brand listing pages; bust the
        // storefront page cache so the next anonymous visitor sees fresh content.
        static::saved(fn () => CacheStorefrontPage::bustAll());
        static::deleted(fn () => CacheStorefrontPage::bustAll());
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    /** @return BelongsTo<Media, $this> */
    public function logo(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'logo_id');
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'brand_id');
    }
}
