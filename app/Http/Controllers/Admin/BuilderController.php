<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\PageBuilder\Services\BuilderService;
use App\Domain\PageBuilder\Support\BuilderDocument;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveBuilderContentRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BuilderController extends Controller
{
    public function __construct(private BuilderService $builder) {}

    public function edit(string $type, string $ulid): Response
    {
        $owner = $this->resolve($type, $ulid);
        $this->authorizeFor($type, $owner);

        return Inertia::render('Admin/PageBuilder/Editor', [
            'document' => [
                'type' => $type,
                'id' => $owner->ulid,
                'title' => $owner->builderTitle(),
                'content' => $owner->builderContentOrDefault(),
                'saveUrl' => route('admin.builder.save', [$type, $owner->ulid]),
                'revisionsUrl' => route('admin.builder.revisions', [$type, $owner->ulid]),
                'restoreUrl' => route('admin.builder.restore', [$type, $owner->ulid]),
                'backUrl' => $this->backUrl($type),
            ],
        ]);
    }

    public function save(SaveBuilderContentRequest $request, string $type, string $ulid): JsonResponse
    {
        // Authorisation + schema validation are enforced by SaveBuilderContentRequest
        // before this method runs.
        $owner = $this->resolve($type, $ulid);

        $data = $request->validated();

        $revision = $this->builder->save(
            $owner,
            $data['content'],
            $data['label'] ?? null,
            $data['publish'] ?? false,
        );

        return response()->json(['ok' => true, 'revision_id' => $revision->id, 'saved_at' => $revision->created_at]);
    }

    public function revisions(string $type, string $ulid): JsonResponse
    {
        $owner = $this->resolve($type, $ulid);
        $this->authorizeFor($type, $owner);

        $revisions = $this->builder->listRevisions($owner)->map(fn ($rev) => [
            'id' => $rev->id,
            'label' => $rev->label,
            'is_published' => $rev->is_published,
            'author' => $rev->createdBy?->name,
            'created_at' => $rev->created_at,
            'component_count' => count($rev->content['components'] ?? []),
        ]);

        return response()->json(['revisions' => $revisions]);
    }

    public function restore(Request $request, string $type, string $ulid): JsonResponse
    {
        $owner = $this->resolve($type, $ulid);
        $this->authorizeFor($type, $owner);

        $data = $request->validate(['revision_id' => ['required', 'integer']]);

        $revision = $this->builder->restore($owner, $data['revision_id']);

        return response()->json(['ok' => true, 'content' => $revision->content]);
    }

    private function resolve(string $type, string $ulid): Model
    {
        return BuilderDocument::resolve($type, $ulid);
    }

    private function authorizeFor(string $type, Model $owner): void
    {
        [$ability, $target] = BuilderDocument::gateArguments($type, $owner);

        $this->authorize($ability, $target);
    }

    private function backUrl(string $type): string
    {
        return match (true) {
            $type === 'category' => route('admin.product-categories.index'),
            $type === 'brand' => route('admin.product-brands.index'),
            in_array($type, BuilderDocument::THEME_TYPES, true) => route('admin.theme-templates.index'),
            default => route('admin.cms-pages.index'),
        };
    }
}
