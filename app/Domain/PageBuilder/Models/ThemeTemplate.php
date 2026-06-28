<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Represents a row in page_builder_theme_templates.
 *
 * Types: header | footer | single | archive | product | 404
 * The `content` column holds a versioned PageSchema JSON object.
 */
class ThemeTemplate extends Model
{
    use SoftDeletes;

    protected $table = 'page_builder_theme_templates';

    protected $fillable = [
        'ulid', 'name', 'type', 'content', 'conditions', 'is_active', 'created_by',
    ];

    protected $casts = [
        'content' => 'array',
        'conditions' => 'array',
        'is_active' => 'boolean',
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

    // ─── Scopes ──────────────────────────────────────────────────────────────

    /** Only active templates. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Filter by template type (header, footer, product, single, …). */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    // ─── Builder compatibility ────────────────────────────────────────────────

    /** The column that stores the live builder schema for this model. */
    public function builderContentColumn(): string
    {
        return 'content';
    }

    /** Polymorphic revision history for the page builder. */
    public function builderRevisions(): MorphMany
    {
        return $this->morphMany(BuilderRevision::class, 'owner')->latest('created_at');
    }

    /** Default empty schema used when a template has no content yet. */
    public function emptyBuilderSchema(): array
    {
        return ['schemaVersion' => 1, 'components' => []];
    }

    /** Return the stored content or an empty schema. */
    public function builderContentOrDefault(): array
    {
        return $this->content ?? $this->emptyBuilderSchema();
    }

    /** Human label shown in the builder top bar. */
    public function builderTitle(): string
    {
        return ucfirst($this->type ?? 'template').' — '.($this->name ?? 'Untitled');
    }

    // ─── Relations ───────────────────────────────────────────────────────────

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
