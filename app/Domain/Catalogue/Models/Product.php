<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Models;

use App\Domain\Media\Models\Media;
use App\Http\Middleware\CacheStorefrontPage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ulid', 'name', 'slug', 'type', 'status',
        'short_description', 'description',
        'sku', 'regular_price', 'sale_price', 'sale_price_from', 'sale_price_to',
        'manage_stock', 'stock_quantity', 'reserved_quantity', 'stock_status', 'backorders', 'low_stock_threshold',
        'weight', 'dimensions', 'shipping_class',
        'is_virtual', 'is_downloadable', 'is_featured',
        'tax_status', 'tax_class',
        'meta_title', 'meta_description', 'og_image_id',
        'sort_order', 'brand_id', 'created_by',
    ];

    protected $casts = [
        'regular_price' => 'integer',
        'sale_price' => 'integer',
        'sale_price_from' => 'datetime',
        'sale_price_to' => 'datetime',
        'manage_stock' => 'boolean',
        'stock_quantity' => 'integer',
        'reserved_quantity' => 'integer',
        'backorders' => 'string',
        'is_virtual' => 'boolean',
        'is_downloadable' => 'boolean',
        'is_featured' => 'boolean',
        'dimensions' => 'array',
        'low_stock_threshold' => 'integer',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });

        // D1 — A product save/delete may change storefront pages (product detail,
        // category listings, home page). Increment the global page-cache version
        // so the next anonymous visitor always sees fresh content.
        static::saved(fn () => CacheStorefrontPage::bustAll());
        static::deleted(fn () => CacheStorefrontPage::bustAll());
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    /** @return BelongsToMany<ProductCategory, $this> */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(ProductCategory::class, 'product_category_product');
    }

    /** @return BelongsTo<ProductBrand, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(ProductBrand::class, 'brand_id');
    }

    /** @return HasMany<ProductImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    /** @return HasMany<ProductImage, $this> */
    public function featuredImage(): HasMany
    {
        return $this->hasMany(ProductImage::class)->where('is_featured', true)->limit(1);
    }

    /** @return HasMany<ProductVariation, $this> */
    public function variations(): HasMany
    {
        return $this->hasMany(ProductVariation::class);
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * D8 — Optional OG image used for social sharing meta tags.
     *
     * @return BelongsTo<Media, $this>
     */
    public function ogImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'og_image_id');
    }

    /** @return HasMany<ProductReview, $this> */
    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    /** @return HasMany<ProductReview, $this> */
    public function approvedReviews(): HasMany
    {
        return $this->hasMany(ProductReview::class)->where('is_approved', true)->latest('created_at');
    }

    public function isSimple(): bool
    {
        return $this->type === 'simple';
    }

    public function isVariable(): bool
    {
        return $this->type === 'variable';
    }

    public function getEffectivePriceAttribute(): ?int
    {
        if ($this->isVariable()) {
            return null;
        }

        return $this->sale_price ?? $this->regular_price;
    }

    public function isOnSale(): bool
    {
        if ($this->isVariable()) {
            return $this->variations->contains(fn ($v) => $v->sale_price !== null);
        }

        if ($this->sale_price === null) {
            return false;
        }

        $now = now();
        if ($this->sale_price_from && $now->isBefore($this->sale_price_from)) {
            return false;
        }
        if ($this->sale_price_to && $now->isAfter($this->sale_price_to)) {
            return false;
        }

        return true;
    }

    public function isInStock(): bool
    {
        if (! $this->manage_stock) {
            return $this->stock_status === 'instock';
        }

        return $this->stock_quantity > 0;
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }
}
