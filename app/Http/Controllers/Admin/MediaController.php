<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Media\Models\Media;
use App\Domain\Media\Services\MediaService;
use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadMediaRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MediaController extends Controller
{
    public function __construct(private MediaService $mediaService) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Media::class);

        $media = Media::query()
            ->when($request->input('collection'), fn ($q, $c) => $q->where('collection', $c))
            ->when($request->input('search'), fn ($q, $s) => $q->where('file_name', 'like', "%{$s}%"))
            ->orderByDesc('created_at')
            ->paginate(40);

        return Inertia::render('Admin/Media/Index', [
            'media' => $media,
            'collection' => $request->input('collection'),
        ]);
    }

    public function store(UploadMediaRequest $request): JsonResponse
    {
        $media = $this->mediaService->store(
            $request->file('file'),
            $request->input('collection', 'default'),
        );

        if ($request->filled('alt')) {
            $media->update(['alt' => $request->input('alt')]);
        }
        if ($request->filled('title')) {
            $media->update(['title' => $request->input('title')]);
        }

        ActivityLogger::log('media', 'uploaded', Media::class, $media->id, null, [
            'file_name' => $media->file_name,
            'collection' => $media->collection,
        ]);

        return response()->json([
            'media' => array_merge($media->toArray(), ['url' => $media->url()]),
        ], 201);
    }

    public function destroy(Media $media): RedirectResponse
    {
        $this->authorize('delete', $media);

        $this->mediaService->delete($media);

        ActivityLogger::log('media', 'deleted', Media::class, $media->id, [
            'file_name' => $media->file_name,
        ]);

        return redirect()->route('admin.media.index')
            ->with('success', 'Media deleted.');
    }
}
