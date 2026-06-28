<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Role extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ulid',
        'name',
        'slug',
        'description',
        'level',
        'is_system_role',
        'is_custom_role',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'is_system_role' => 'boolean',
            'is_custom_role' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $role) {
            if (empty($role->ulid)) {
                $role->ulid = (string) Str::ulid();
            }
        });
    }

    /** @return BelongsToMany<Permission, $this> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'permission_role');
    }

    /** @return BelongsToMany<User, $this> */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'role_user');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @param Builder<Role> $query */
    public function scopeSystemRoles(Builder $query): void
    {
        $query->where('is_system_role', true);
    }

    /** @param Builder<Role> $query */
    public function scopeCustomRoles(Builder $query): void
    {
        $query->where('is_custom_role', true);
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }
}
