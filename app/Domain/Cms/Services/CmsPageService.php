<?php

declare(strict_types=1);

namespace App\Domain\Cms\Services;

use App\Domain\Cms\Models\CmsPage;
use App\Domain\Cms\Models\CmsPageRevision;
use App\Domain\Shared\Services\ActivityLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CmsPageService
{
    public function paginate(int $perPage = 20, array $filters = []): LengthAwarePaginator
    {
        $query = CmsPage::query()->with(['createdBy'])->latest();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $query->where('title', 'like', "%{$filters['search']}%");
        }

        return $query->paginate($perPage);
    }

    public function create(array $data): CmsPage
    {
        return DB::transaction(function () use ($data) {
            $content = $data['content'] ?? ['schemaVersion' => 1, 'components' => []];
            unset($data['content']);

            $data['slug'] ??= Str::slug($data['title']);
            $data['created_by'] = Auth::id();

            $page = CmsPage::create($data);

            CmsPageRevision::create([
                'page_id' => $page->id,
                'content' => $content,
                'label' => 'Initial draft',
                'created_by' => Auth::id(),
            ]);

            ActivityLogger::log('cms', 'page_created', CmsPage::class, $page->id, null, $page->toArray());

            return $page;
        });
    }

    public function update(CmsPage $page, array $data): CmsPage
    {
        return DB::transaction(function () use ($page, $data) {
            $old = $page->toArray();
            $content = $data['content'] ?? null;
            unset($data['content']);

            $page->update($data);

            if ($content !== null) {
                CmsPageRevision::create([
                    'page_id' => $page->id,
                    'content' => $content,
                    'label' => 'Auto-save',
                    'created_by' => Auth::id(),
                ]);
            }

            ActivityLogger::log('cms', 'page_updated', CmsPage::class, $page->id, $old, $page->toArray());

            return $page->fresh();
        });
    }

    public function publish(CmsPage $page, array $content): CmsPage
    {
        return DB::transaction(function () use ($page, $content) {
            $revision = CmsPageRevision::create([
                'page_id' => $page->id,
                'content' => $content,
                'label' => 'Published',
                'created_by' => Auth::id(),
            ]);

            $page->update([
                'status' => 'published',
                'published_at' => now(),
            ]);

            ActivityLogger::log('cms', 'page_published', CmsPage::class, $page->id, null, ['revision_id' => $revision->id]);

            return $page->fresh();
        });
    }

    public function delete(CmsPage $page): void
    {
        ActivityLogger::log('cms', 'page_deleted', CmsPage::class, $page->id, $page->toArray(), null);
        $page->delete();
    }
}
