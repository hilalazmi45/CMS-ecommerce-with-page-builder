<?php

declare(strict_types=1);

namespace App\Domain\Shipping\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShippingZone extends Model
{
    protected $table = 'shipping_zones';

    protected $fillable = ['name', 'regions', 'sort_order'];

    protected $casts = [
        'regions' => 'array',
        'sort_order' => 'integer',
    ];

    public function methods(): HasMany
    {
        return $this->hasMany(ShippingZoneMethod::class, 'zone_id')->orderBy('sort_order');
    }
}
