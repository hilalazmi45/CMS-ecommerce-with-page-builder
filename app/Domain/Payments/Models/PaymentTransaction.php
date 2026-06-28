<?php

declare(strict_types=1);

namespace App\Domain\Payments\Models;

use App\Domain\Orders\Models\Order;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PaymentTransaction extends Model
{
    protected $table = 'payment_transactions';

    public $timestamps = false;

    protected $fillable = [
        'ulid', 'order_id', 'gateway', 'status', 'amount', 'reference', 'payload',
    ];

    protected $casts = [
        'amount' => 'integer',
        'payload' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
