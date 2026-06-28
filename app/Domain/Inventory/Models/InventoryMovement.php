<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Models;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductVariation;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class InventoryMovement extends Model
{
    protected $table = 'inventory_movements';

    public $timestamps = false;

    protected $fillable = [
        'product_id', 'variation_id', 'type', 'quantity',
        'stock_after', 'reference_type', 'reference_id', 'note', 'created_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_after' => 'integer',
        'created_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variation(): BelongsTo
    {
        return $this->belongsTo(ProductVariation::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo('reference');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
