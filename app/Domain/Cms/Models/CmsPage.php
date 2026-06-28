<?php

declare(strict_types=1);

namespace App\Domain\Cms\Models;

use App\Domain\PageBuilder\Concerns\HasPageBuilder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CmsPage extends Model
{
    use HasFactory, HasPageBuilder, SoftDeletes;

    protected $table = 'cms_pages';

    protected $fillable = [
        'ulid', 'title', 'slug', 'status', 'template',
        'meta_title', 'meta_description', 'og_image',
        'published_at', 'scheduled_at', 'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            $model->ulid ??= Str::ulid()->toString();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(CmsPageRevision::class, 'page_id')->latest('created_at');
    }

    public function latestRevision(): HasOne
    {
        return $this->hasOne(CmsPageRevision::class, 'page_id')->latestOfMany('created_at');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }
}
