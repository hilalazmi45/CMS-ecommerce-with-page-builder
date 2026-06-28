<?php

declare(strict_types=1);

namespace App\Domain\Shipping\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingZoneMethod extends Model
{
    protected $table = 'shipping_zone_methods';

    protected $fillable = [
        'zone_id', 'method_type', 'title', 'cost', 'conditions', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'cost' => 'integer',
        'conditions' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'zone_id');
    }

    public function isFree(): bool
    {
        return $this->method_type === 'free_shipping' || $this->cost === 0;
    }
}
