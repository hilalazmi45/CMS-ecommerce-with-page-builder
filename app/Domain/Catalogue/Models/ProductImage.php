<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Models;

use App\Domain\Media\Models\Media;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property int $media_id
 * @property int $sort_order
 * @property bool $is_featured
 * @property-read string $url
 * @property-read string|null $alt
 * @property-read Product $product
 * @property-read Media|null $media
 */
class ProductImage extends Model
{
    protected $table = 'product_images';

    public $timestamps = false;

    protected $fillable = [
        'product_id', 'media_id', 'sort_order', 'is_featured',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_featured' => 'boolean',
    ];

    /** Expose a resolved image URL + alt text to the frontend payload. */
    protected $appends = ['url', 'alt'];

    public function getUrlAttribute(): string
    {
        return $this->media?->url() ?? '';
    }

    public function getAltAttribute(): ?string
    {
        return $this->media?->alt;
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
