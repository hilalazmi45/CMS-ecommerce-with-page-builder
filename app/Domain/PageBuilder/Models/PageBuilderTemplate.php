<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Models;

use App\Models\Media;
use App\Models\User;
use Database\Factories\PageBuilderTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PageBuilderTemplate extends Model
{
    /** @use HasFactory<PageBuilderTemplateFactory> */
    use HasFactory, SoftDeletes;

    protected static function newFactory(): PageBuilderTemplateFactory
    {
        return PageBuilderTemplateFactory::new();
    }

    protected $table = 'page_builder_templates';

    protected $fillable = [
        'ulid', 'name', 'type', 'content', 'preview_image_id', 'is_global', 'created_by',
    ];

    protected $casts = [
        'content' => 'array',
        'is_global' => 'boolean',
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

    public function previewImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'preview_image_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
