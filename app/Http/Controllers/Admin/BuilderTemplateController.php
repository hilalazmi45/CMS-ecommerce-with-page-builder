<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\PageBuilder\Models\PageBuilderTemplate;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\RBACService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderTemplateController extends Controller
{
    /**
     * List templates visible to the current user:
     * - their own templates
     * - globally shared templates
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $user = $request->user();

        $templates = PageBuilderTemplate::query()
            ->where(function ($q) use ($user): void {
                $q->where('is_global', true)
                    ->orWhere('created_by', $user?->id);
            })
            ->latest()
            ->get(['ulid', 'name', 'type', 'is_global', 'created_by', 'content', 'created_at'])
            ->map(fn (PageBuilderTemplate $t): array => [
                'ulid' => $t->ulid,
                'name' => $t->name,
                'type' => $t->type,
                'is_global' => $t->is_global,
                'created_at' => $t->created_at?->toIso8601String(),
                'component_count' => is_array($t->content['components'] ?? null)
                    ? count($t->content['components'])
                    : 0,
                'content' => $t->content,
            ]);

        return response()->json(['templates' => $templates]);
    }

    /**
     * Save a new template from the editor.
     * Content is the full PageSchema or a component subtree.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', 'string', 'in:section,page,header,footer'],
            'content' => ['required', 'array'],
            'content.schemaVersion' => ['required', 'integer'],
            'content.components' => ['present', 'array', 'max:500'],
            'is_global' => ['boolean'],
        ]);

        $template = PageBuilderTemplate::create([
            'name' => $data['name'],
            'type' => $data['type'],
            'content' => $data['content'],
            'is_global' => $data['is_global'] ?? false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'ok' => true,
            'ulid' => $template->ulid,
            'name' => $template->name,
        ], 201);
    }

    /**
     * Delete a template owned by the current user (or any for super-admins).
     */
    public function destroy(Request $request, PageBuilderTemplate $template): JsonResponse
    {
        $this->authorize('update', Setting::class);

        $user = $request->user();

        // Non-superadmins may only delete their own templates
        $isSuperAdmin = $user !== null && app(RBACService::class)->isSuperAdmin($user);
        if (! $isSuperAdmin && $template->created_by !== $user?->id) {
            abort(403, 'You may only delete your own templates.');
        }

        $template->delete();

        return response()->json(['ok' => true]);
    }
}
