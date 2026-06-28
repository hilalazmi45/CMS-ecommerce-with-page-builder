<?php

declare(strict_types=1);

namespace App\Domain\Customers\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CustomerAddress extends Model
{
    protected $table = 'customer_addresses';

    protected $fillable = [
        'ulid', 'user_id', 'type', 'label',
        'first_name', 'last_name', 'company',
        'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'phone',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });

        static::saving(function (self $model): void {
            if ($model->is_default) {
                self::where('user_id', $model->user_id)
                    ->where('type', $model->type)
                    ->where('id', '!=', $model->id ?? 0)
                    ->update(['is_default' => false]);
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
