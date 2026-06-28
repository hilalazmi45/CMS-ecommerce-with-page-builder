<?php

declare(strict_types=1);

namespace App\Domain\Customers\Models;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Wishlist row.
 *
 * One row per user + product + variation combination.
 * There is no updated_at — only created_at (useCurrent).
 *
 * @property int $id
 * @property int $user_id
 * @property int $product_id
 * @property int|null $variation_id
 */
class Wishlist extends Model
{
    /** No updated_at column on this table. */
    public const UPDATED_AT = null;

    protected $table = 'wishlists';

    protected $fillable = [
        'user_id',
        'product_id',
        'variation_id',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'product_id' => 'integer',
        'variation_id' => 'integer',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<ProductVariation, $this> */
    public function variation(): BelongsTo
    {
        return $this->belongsTo(ProductVariation::class);
    }
}
