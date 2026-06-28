<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderAddress extends Model
{
    protected $table = 'order_addresses';

    public $timestamps = false;

    protected $fillable = [
        'order_id', 'type', 'first_name', 'last_name', 'company',
        'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'phone', 'email',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
