<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Cms\Models\CmsPage;
use App\Domain\Cms\Services\CmsPageService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CmsPageController extends Controller
{
    public function __construct(private CmsPageService $cmsPageService) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', CmsPage::class);

        return Inertia::render('Admin/CmsPages/Index', [
            'pages' => $this->cmsPageService->paginate(20, $request->only(['status', 'search'])),
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', CmsPage::class);

        return Inertia::render('Admin/CmsPages/Form');
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', CmsPage::class);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:cms_pages,slug'],
            'status' => ['required', 'in:draft,published,archived'],
            'template' => ['nullable', 'string'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);

        $page = $this->cmsPageService->create($data);

        return redirect()->route('admin.cms-pages.edit', $page->ulid)
            ->with('success', 'Page created. Open the builder to add content.');
    }

    public function edit(CmsPage $cmsPage): Response
    {
        $this->authorize('update', $cmsPage);

        return Inertia::render('Admin/CmsPages/Form', [
            'page' => $cmsPage->load(['latestRevision', 'createdBy']),
        ]);
    }

    public function update(Request $request, CmsPage $cmsPage): RedirectResponse
    {
        $this->authorize('update', $cmsPage);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:cms_pages,slug,'.$cmsPage->id],
            'status' => ['required', 'in:draft,published,archived'],
            'template' => ['nullable', 'string'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);

        $this->cmsPageService->update($cmsPage, $data);

        return back()->with('success', 'Page updated.');
    }

    public function destroy(CmsPage $cmsPage): RedirectResponse
    {
        $this->authorize('delete', $cmsPage);
        $this->cmsPageService->delete($cmsPage);

        return redirect()->route('admin.cms-pages.index')->with('success', 'Page deleted.');
    }

    public function saveContent(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $this->authorize('update', $cmsPage);

        $data = $request->validate([
            'content' => ['required', 'array'],
            'content.schemaVersion' => ['required', 'integer'],
            'content.components' => ['required', 'array'],
            'publish' => ['boolean'],
        ]);

        if ($data['publish'] ?? false) {
            $this->cmsPageService->publish($cmsPage, $data['content']);
        } else {
            $this->cmsPageService->update($cmsPage, ['content' => $data['content']]);
        }

        return response()->json(['ok' => true]);
    }
}
