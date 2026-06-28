<?php

declare(strict_types=1);

namespace App\Domain\Promotions\Models;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'ulid', 'code', 'type', 'amount',
        'min_spend', 'max_spend',
        'usage_limit', 'usage_count', 'per_customer_limit',
        'individual_use', 'exclude_sale_items', 'allowed_emails',
        'expires_at', 'is_active', 'created_by',
    ];

    protected $casts = [
        'amount' => 'integer',
        'min_spend' => 'integer',
        'max_spend' => 'integer',
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'per_customer_limit' => 'integer',
        'individual_use' => 'boolean',
        'exclude_sale_items' => 'boolean',
        'allowed_emails' => 'array',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
            $model->code = strtoupper($model->code);
        });
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    /** @return BelongsToMany<Product, $this> */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'coupon_product_restrictions')
            ->withPivot('is_excluded');
    }

    /** @return BelongsToMany<ProductCategory, $this> */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(ProductCategory::class, 'coupon_category_restrictions', 'coupon_id', 'product_category_id')
            ->withPivot('is_excluded');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isUsageLimitReached(): bool
    {
        return $this->usage_limit !== null && $this->usage_count >= $this->usage_limit;
    }

    public function isValid(): bool
    {
        return $this->is_active && ! $this->isExpired() && ! $this->isUsageLimitReached();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
