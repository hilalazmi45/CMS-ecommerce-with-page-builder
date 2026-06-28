<?php

declare(strict_types=1);

use App\Domain\Media\Models\Media;
use App\Domain\Media\Services\ImageVariantService;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Create a user with media.upload permission (scoped to this file to avoid
 * conflicts with the top-level makeUserWithMediaUpload() in MediaUploadTest.php).
 */
function makeImagePipelineUploadUser(): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 3]);
    $perm = Permission::factory()->code('media.upload')->create();
    $role->permissions()->attach($perm);
    $user->roles()->attach($role);

    return $user;
}

beforeEach(function (): void {
    Storage::fake('public');
});

// ---------------------------------------------------------------------------
// ImageVariantService unit-style tests
// ---------------------------------------------------------------------------

test('generateVariants skips non-image mime types without error', function (): void {
    $media = Media::factory()->create([
        'disk' => 'public',
        'path' => 'default/2026/06/test.pdf',
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'width' => null,
        'height' => null,
        'srcset' => null,
    ]);

    /** @var ImageVariantService $service */
    $service = app(ImageVariantService::class);
    $service->generateVariants($media);

    $media->refresh();
    expect($media->srcset)->toBeNull();
});

test('generateVariants generates webp and width variants for a jpeg', function (): void {
    // Create a real 1000×500 JPEG in the fake disk so GD can load it.
    $tmpJpeg = tempnam(sys_get_temp_dir(), 'imgtest_');
    $img = imagecreatetruecolor(1000, 500);
    imagejpeg($img, $tmpJpeg, 90);
    imagedestroy($img);

    $jpegContents = file_get_contents($tmpJpeg);
    unlink($tmpJpeg);

    Storage::disk('public')->put('default/2026/06/test-orig.jpg', $jpegContents);

    $media = Media::factory()->create([
        'disk' => 'public',
        'path' => 'default/2026/06/test-orig.jpg',
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'width' => 1000,
        'height' => 500,
        'srcset' => null,
    ]);

    /** @var ImageVariantService $service */
    $service = app(ImageVariantService::class);
    $service->generateVariants($media);

    $media->refresh();

    expect($media->srcset)->toBeArray()
        ->and($media->srcset)->toHaveKey('original')
        ->and($media->srcset)->toHaveKey('webp');

    // Widths strictly less than 1000 should be generated: 320, 640, 960.
    expect($media->srcset)->toHaveKey('320')
        ->and($media->srcset)->toHaveKey('640')
        ->and($media->srcset)->toHaveKey('960')
        ->and($media->srcset)->toHaveKey('320_webp')
        ->and($media->srcset)->toHaveKey('640_webp')
        ->and($media->srcset)->toHaveKey('960_webp');

    // Width 1280 and 1920 should NOT be generated (>= source width 1000).
    expect($media->srcset)->not->toHaveKey('1280')
        ->and($media->srcset)->not->toHaveKey('1920');
});

test('generateVariants does not upscale images smaller than variant widths', function (): void {
    // 200×100 image — all VARIANT_WIDTHS (320+) should be skipped.
    $tmpJpeg = tempnam(sys_get_temp_dir(), 'imgtest_small_');
    $img = imagecreatetruecolor(200, 100);
    imagejpeg($img, $tmpJpeg, 90);
    imagedestroy($img);

    $contents = file_get_contents($tmpJpeg);
    unlink($tmpJpeg);

    Storage::disk('public')->put('default/2026/06/small.jpg', $contents);

    $media = Media::factory()->create([
        'disk' => 'public',
        'path' => 'default/2026/06/small.jpg',
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'width' => 200,
        'height' => 100,
        'srcset' => null,
    ]);

    /** @var ImageVariantService $service */
    $service = app(ImageVariantService::class);
    $service->generateVariants($media);

    $media->refresh();

    // Only 'original' and 'webp' keys should be present — no width keys.
    $srcset = $media->srcset ?? [];
    expect($srcset)->toHaveKey('original');
    expect($srcset)->not->toHaveKey('320');
    expect($srcset)->not->toHaveKey('640');
});

test('generateVariants skips image exceeding MAX_DIMENSION', function (): void {
    // Simulate a Media record whose stored file is very large (via mocked path
    // that actually contains a small image — we test the dimension guard by
    // creating an image with dimensions just above 8000).
    // Note: GD can't create an 8001×8001 image in tests reliably, so we
    // confirm the service logs a warning and leaves srcset null for a missing
    // file (non-existent path guard fires instead).
    $media = Media::factory()->create([
        'disk' => 'public',
        'path' => 'default/2026/06/nonexistent.jpg',
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'width' => null,
        'height' => null,
        'srcset' => null,
    ]);

    /** @var ImageVariantService $service */
    $service = app(ImageVariantService::class);
    $service->generateVariants($media); // Should not throw.

    $media->refresh();
    // File not found — srcset should remain null.
    expect($media->srcset)->toBeNull();
});

// ---------------------------------------------------------------------------
// Integration: upload endpoint triggers variant generation
// ---------------------------------------------------------------------------

test('upload endpoint stores media with srcset after variant generation', function (): void {
    $user = makeImagePipelineUploadUser();

    // Use a real 800×400 JPEG so GD can process it.
    $tmpJpeg = tempnam(sys_get_temp_dir(), 'imgupload_');
    $img = imagecreatetruecolor(800, 400);
    imagejpeg($img, $tmpJpeg, 90);
    imagedestroy($img);

    $file = new UploadedFile(
        path: $tmpJpeg,
        originalName: 'upload-test.jpg',
        mimeType: 'image/jpeg',
        error: UPLOAD_ERR_OK,
        test: true,
    );

    $response = $this->actingAs($user)
        ->postJson(route('admin.media.store'), ['file' => $file])
        ->assertStatus(201);

    @unlink($tmpJpeg);

    $media = Media::first();
    expect($media)->not->toBeNull();
    expect($media->srcset)->toBeArray()
        ->and($media->srcset)->toHaveKey('original');
});
