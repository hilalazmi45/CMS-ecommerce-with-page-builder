<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'module',
        'action',
        'description',
    ];

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'permission_role');
    }

    /** @param Builder<Permission> $query */
    public function scopeByModule(Builder $query, string $module): void
    {
        $query->where('module', $module);
    }

    /** @param Builder<Permission> $query */
    public function scopeByAction(Builder $query, string $action): void
    {
        $query->where('action', $action);
    }
}
