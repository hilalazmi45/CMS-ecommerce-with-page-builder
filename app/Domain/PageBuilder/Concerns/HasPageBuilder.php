<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Concerns;

use App\Domain\PageBuilder\Models\BuilderRevision;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Gives any model an editable page-builder document + revision history.
 *
 * Requires:
 *  - a nullable json `builder_content` column on the model's table
 *  - `builder_content` cast to array (added automatically via initialize hook)
 */
trait HasPageBuilder
{
    public function initializeHasPageBuilder(): void
    {
        $this->casts['builder_content'] = 'array';
        if (! in_array('builder_content', $this->fillable, true)) {
            $this->fillable[] = 'builder_content';
        }
    }

    public function builderRevisions(): MorphMany
    {
        return $this->morphMany(BuilderRevision::class, 'owner')->latest('created_at');
    }

    /** Default empty schema used when a document has no content yet. */
    public function emptyBuilderSchema(): array
    {
        return ['schemaVersion' => 1, 'components' => []];
    }

    public function builderContentOrDefault(): array
    {
        return $this->builder_content ?? $this->emptyBuilderSchema();
    }

    /** Human label shown in the builder top bar. */
    public function builderTitle(): string
    {
        return $this->title ?? $this->name ?? 'Untitled';
    }
}
