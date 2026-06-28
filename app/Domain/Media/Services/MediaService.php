<?php

declare(strict_types=1);

namespace App\Domain\Media\Services;

use App\Domain\Media\Models\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaService
{
    public function store(UploadedFile $file, string $collection = 'default', string $disk = 'public'): Media
    {
        $extension = $file->getClientOriginalExtension();
        $path = $file->storeAs(
            $collection.'/'.now()->format('Y/m'),
            Str::ulid().'.'.$extension,
            $disk,
        );

        if ($path === false) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }

        $dimensions = $this->getDimensions($file);

        $media = Media::create([
            'disk' => $disk,
            'path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'extension' => $extension,
            'size' => $file->getSize(),
            'width' => $dimensions['width'],
            'height' => $dimensions['height'],
            'collection' => $collection,
            'uploaded_by' => Auth::id(),
        ]);

        try {
            app(ImageVariantService::class)->generateVariants($media);
        } catch (\Throwable $e) {
            Log::warning('ImageVariantService call failed', [
                'media_id' => $media->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $media;
    }

    public function delete(Media $media): bool
    {
        Storage::disk($media->disk)->delete($media->path);
        $media->delete();

        return true;
    }

    /** @return array{width: int|null, height: int|null} */
    private function getDimensions(UploadedFile $file): array
    {
        if (! str_starts_with($file->getMimeType() ?? '', 'image/')) {
            return ['width' => null, 'height' => null];
        }

        $size = @getimagesize($file->getRealPath());

        return [
            'width' => $size !== false ? (int) $size[0] : null,
            'height' => $size !== false ? (int) $size[1] : null,
        ];
    }
}
