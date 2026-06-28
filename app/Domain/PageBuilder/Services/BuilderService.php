<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Services;

use App\Domain\PageBuilder\Models\BuilderRevision;
use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Middleware\CacheStorefrontPage;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BuilderService
{
    /**
     * Persist builder content for a document. Always writes the live
     * `builder_content` and appends a revision so history is never lost.
     */
    public function save(Model $owner, array $content, ?string $label = null, bool $publish = false): BuilderRevision
    {
        return DB::transaction(function () use ($owner, $content, $label, $publish) {
            $column = method_exists($owner, 'builderContentColumn') ? $owner->builderContentColumn() : 'builder_content';
            $owner->forceFill([$column => $content]);

            // If the owner has a publish-able status column, flip it on publish.
            if ($publish && in_array('status', $owner->getFillable(), true)) {
                $owner->status = 'published';
                if (in_array('published_at', $owner->getFillable(), true)) {
                    $owner->published_at = now();
                }
            }

            $owner->save();

            $revision = $owner->builderRevisions()->create([
                'content' => $content,
                'label' => $label ?? ($publish ? 'Published' : 'Auto-save'),
                'is_published' => $publish,
                'created_by' => Auth::id(),
            ]);

            $this->pruneAutoSaves($owner);

            // D1 — Bust the storefront page cache after a publish so the next
            // anonymous visitor always fetches the freshly-saved content.
            // We increment after the transaction commits (inside it here because
            // the version counter is in cache, not in the DB transaction).
            if ($publish) {
                CacheStorefrontPage::bustAll();
            }

            ActivityLogger::log(
                'page_builder',
                $publish ? 'published' : 'saved',
                $owner::class,
                $owner->getKey(),
                null,
                ['revision_id' => $revision->id, 'label' => $revision->label]
            );

            return $revision;
        });
    }

    /** @return Collection<int, BuilderRevision> */
    public function listRevisions(Model $owner, int $limit = 50): Collection
    {
        return $owner->builderRevisions()
            ->with('createdBy:id,name')
            ->limit($limit)
            ->get();
    }

    public function restore(Model $owner, int $revisionId): BuilderRevision
    {
        $revision = $owner->builderRevisions()->findOrFail($revisionId);

        return $this->save(
            $owner,
            $revision->content,
            "Restored from #{$revision->id}",
            false
        );
    }

    /**
     * Keep history readable: retain the most recent 20 auto-saves but never
     * delete published or restore checkpoints.
     */
    private function pruneAutoSaves(Model $owner): void
    {
        $autoSaveIds = $owner->builderRevisions()
            ->where('label', 'Auto-save')
            ->orderByDesc('created_at')
            ->skip(20)
            ->take(100)
            ->pluck('id');

        if ($autoSaveIds->isNotEmpty()) {
            BuilderRevision::whereIn('id', $autoSaveIds)->delete();
        }
    }
}
