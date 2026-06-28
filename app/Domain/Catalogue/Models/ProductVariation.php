<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Models;

use App\Domain\Media\Models\Media;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ProductVariation extends Model
{
    use HasFactory;

    protected $table = 'product_variations';

    protected $fillable = [
        'ulid', 'product_id', 'sku', 'regular_price', 'sale_price',
        'stock_quantity', 'reserved_quantity', 'manage_stock', 'attribute_values', 'image_id', 'is_active',
    ];

    protected $casts = [
        'regular_price' => 'integer',
        'sale_price' => 'integer',
        'stock_quantity' => 'integer',
        'reserved_quantity' => 'integer',
        'manage_stock' => 'boolean',
        'backorders' => 'string',
        'attribute_values' => 'array',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Media, $this> */
    public function image(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'image_id');
    }

    public function getEffectivePriceAttribute(): int
    {
        return $this->sale_price ?? $this->regular_price;
    }

    public function isInStock(): bool
    {
        if (! $this->manage_stock) {
            return true;
        }

        return $this->stock_quantity > 0;
    }
}
