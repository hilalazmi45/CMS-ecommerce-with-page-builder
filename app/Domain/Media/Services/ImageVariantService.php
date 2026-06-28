<?php

declare(strict_types=1);

namespace App\Domain\Media\Services;

use App\Domain\Media\Models\Media;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Generates WebP and responsive-width image variants for a Media record.
 *
 * Only processes JPEG, PNG, and WebP uploads. Degrades gracefully when GD
 * functions are unavailable or when image dimensions exceed safety bounds.
 * All file operations go through Storage::put() — no direct filesystem writes.
 */
final class ImageVariantService
{
    /** MIME types this service will process. */
    private const SUPPORTED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    /** Responsive widths to generate (never upscales). */
    private const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920];

    /** Maximum dimension allowed (decompression bomb guard). */
    private const MAX_DIMENSION = 8000;

    /**
     * Generate WebP + responsive variants for the given Media record.
     *
     * Updates `$media->srcset` (and width/height if not already set) in the
     * database. Never throws — all failures are logged and the method returns
     * gracefully so that the upload pipeline continues.
     */
    public function generateVariants(Media $media): void
    {
        try {
            $this->process($media);
        } catch (\Throwable $e) {
            Log::warning('ImageVariantService: unexpected error', [
                'media_id' => $media->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function process(Media $media): void
    {
        if (! in_array($media->mime_type, self::SUPPORTED_MIMES, true)) {
            return;
        }

        if (! extension_loaded('gd')) {
            Log::warning('ImageVariantService: GD extension not loaded', ['media_id' => $media->id]);

            return;
        }

        $sourcePath = Storage::disk($media->disk)->path($media->path);

        if (! file_exists($sourcePath)) {
            Log::warning('ImageVariantService: source file not found', [
                'media_id' => $media->id,
                'path' => $sourcePath,
            ]);

            return;
        }

        $sourceImage = $this->loadImage($media->mime_type, $sourcePath);

        if ($sourceImage === null) {
            return;
        }

        $sourceWidth = imagesx($sourceImage);
        $sourceHeight = imagesy($sourceImage);

        // Decompression bomb guard.
        if ($sourceWidth > self::MAX_DIMENSION || $sourceHeight > self::MAX_DIMENSION) {
            Log::warning('ImageVariantService: image exceeds max dimension, skipping', [
                'media_id' => $media->id,
                'width' => $sourceWidth,
                'height' => $sourceHeight,
            ]);
            imagedestroy($sourceImage);

            return;
        }

        /** @var array<string, string> $srcset */
        $srcset = [];

        // Store original URL as the base fallback.
        $srcset['original'] = Storage::disk($media->disk)->url($media->path);

        // Generate WebP of the original.
        $webpOriginalPath = $this->variantPath($media->path, 'original', 'webp');
        if ($this->saveWebp($sourceImage, $media->disk, $webpOriginalPath)) {
            $srcset['webp'] = Storage::disk($media->disk)->url($webpOriginalPath);
        }

        // Generate responsive width variants.
        foreach (self::VARIANT_WIDTHS as $targetWidth) {
            if ($targetWidth >= $sourceWidth) {
                // Never upscale.
                continue;
            }

            $targetHeight = (int) round(($sourceHeight * $targetWidth) / $sourceWidth);
            $resized = imagecreatetruecolor($targetWidth, $targetHeight);

            if ($resized === false) {
                Log::warning('ImageVariantService: imagecreatetruecolor failed', [
                    'media_id' => $media->id,
                    'target_width' => $targetWidth,
                ]);

                continue;
            }

            // Preserve transparency for PNG/WebP sources.
            $this->preserveTransparency($resized, $media->mime_type);

            imagecopyresampled(
                $resized,
                $sourceImage,
                0, 0, 0, 0,
                $targetWidth, $targetHeight,
                $sourceWidth, $sourceHeight,
            );

            // Save in original format.
            $variantPath = $this->variantPath($media->path, (string) $targetWidth, $media->extension);
            if ($this->saveImage($resized, $media->mime_type, $media->disk, $variantPath)) {
                $srcset[(string) $targetWidth] = Storage::disk($media->disk)->url($variantPath);
            }

            // Save as WebP.
            $variantWebpPath = $this->variantPath($media->path, (string) $targetWidth, 'webp');
            if ($this->saveWebp($resized, $media->disk, $variantWebpPath)) {
                $srcset[$targetWidth.'_webp'] = Storage::disk($media->disk)->url($variantWebpPath);
            }

            imagedestroy($resized);
        }

        imagedestroy($sourceImage);

        // Persist srcset and update width/height if not already recorded.
        $updates = ['srcset' => $srcset];

        if ($media->width === null) {
            $updates['width'] = $sourceWidth;
        }

        if ($media->height === null) {
            $updates['height'] = $sourceHeight;
        }

        $media->update($updates);
    }

    /**
     * Load a GD image resource from disk.
     */
    private function loadImage(string $mimeType, string $path): ?\GdImage
    {
        $image = match ($mimeType) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default => false,
        };

        if ($image === false) {
            Log::warning('ImageVariantService: could not load image', [
                'mime_type' => $mimeType,
                'path' => $path,
            ]);

            return null;
        }

        return $image;
    }

    /**
     * Save a GD image in its original format via Storage.
     */
    private function saveImage(\GdImage $image, string $mimeType, string $disk, string $storagePath): bool
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'imgv_');

        if ($tmpFile === false) {
            return false;
        }

        try {
            $success = match ($mimeType) {
                'image/jpeg' => imagejpeg($image, $tmpFile, 85),
                'image/png' => imagepng($image, $tmpFile, 6),
                'image/webp' => function_exists('imagewebp') ? imagewebp($image, $tmpFile, 85) : false,
                default => false,
            };

            if (! $success) {
                return false;
            }

            $contents = file_get_contents($tmpFile);

            if ($contents === false) {
                return false;
            }

            return Storage::disk($disk)->put($storagePath, $contents);
        } finally {
            @unlink($tmpFile);
        }
    }

    /**
     * Save a GD image as WebP via Storage.
     */
    private function saveWebp(\GdImage $image, string $disk, string $storagePath): bool
    {
        if (! function_exists('imagewebp')) {
            return false;
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'imgv_webp_');

        if ($tmpFile === false) {
            return false;
        }

        try {
            if (! imagewebp($image, $tmpFile, 85)) {
                return false;
            }

            $contents = file_get_contents($tmpFile);

            if ($contents === false) {
                return false;
            }

            return Storage::disk($disk)->put($storagePath, $contents);
        } finally {
            @unlink($tmpFile);
        }
    }

    /**
     * Compute a storage path for a variant, e.g.
     * "default/2026/06/01ABC.jpg" → "default/2026/06/01ABC-320.webp"
     */
    private function variantPath(string $originalPath, string $suffix, string $extension): string
    {
        $dir = dirname($originalPath);
        $base = pathinfo($originalPath, PATHINFO_FILENAME);

        return $dir.'/'.$base.'-'.$suffix.'.'.$extension;
    }

    /**
     * Configure a true-colour canvas to preserve PNG/WebP transparency.
     */
    private function preserveTransparency(\GdImage $image, string $mimeType): void
    {
        if (in_array($mimeType, ['image/png', 'image/webp'], true)) {
            imagealphablending($image, false);
            imagesavealpha($image, true);
            $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
            if ($transparent !== false) {
                imagefilledrectangle($image, 0, 0, imagesx($image), imagesy($image), $transparent);
            }
            imagealphablending($image, true);
        }
    }
}
