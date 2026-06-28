<?php

declare(strict_types=1);

use App\Domain\Media\Models\Media;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function makeUserWithMediaUpload(): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 3]);
    $perm = Permission::factory()->code('media.upload')->create();
    $role->permissions()->attach($perm);
    $user->roles()->attach($role);

    return $user;
}

beforeEach(function () {
    Storage::fake('public');
});

test('authenticated user with media.upload can upload a file', function () {
    $user = makeUserWithMediaUpload();

    $file = UploadedFile::fake()->image('photo.jpg', 100, 100);

    $this->actingAs($user)
        ->postJson(route('admin.media.store'), ['file' => $file])
        ->assertStatus(201)
        ->assertJsonStructure(['media' => ['id', 'ulid', 'file_name', 'mime_type', 'url']]);

    $this->assertDatabaseHas('media', ['file_name' => 'photo.jpg']);
});

test('file is persisted on the storage disk after upload', function () {
    $user = makeUserWithMediaUpload();
    $file = UploadedFile::fake()->image('banner.png');

    $this->actingAs($user)
        ->postJson(route('admin.media.store'), ['file' => $file]);

    $media = Media::first();
    expect($media)->not->toBeNull();

    Storage::disk('public')->assertExists($media->path);
});

test('unauthenticated user cannot upload media', function () {
    $file = UploadedFile::fake()->image('hack.jpg');

    $this->postJson(route('admin.media.store'), ['file' => $file])
        ->assertUnauthorized();
});

test('user without media.upload permission gets 403', function () {
    $user = User::factory()->create();

    $file = UploadedFile::fake()->image('denied.jpg');

    $this->actingAs($user)
        ->postJson(route('admin.media.store'), ['file' => $file])
        ->assertForbidden();
});

test('files with disallowed mime types are rejected', function () {
    $user = makeUserWithMediaUpload();
    $file = UploadedFile::fake()->create('script.php', 100, 'application/x-php');

    $this->actingAs($user)
        ->postJson(route('admin.media.store'), ['file' => $file])
        ->assertStatus(422);
});

test('user with media.delete can delete a media record', function () {
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 3]);
    $perm = Permission::factory()->code('media.delete')->create();
    $role->permissions()->attach($perm);
    $user->roles()->attach($role);

    // Seed a media record
    $media = Media::create([
        'disk' => 'public',
        'path' => 'media/test.jpg',
        'file_name' => 'test.jpg',
        'mime_type' => 'image/jpeg',
        'extension' => 'jpg',
        'size' => 1024,
        'collection' => 'default',
        'uploaded_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->delete(route('admin.media.destroy', $media->ulid))
        ->assertRedirect(route('admin.media.index'));

    $this->assertSoftDeleted('media', ['id' => $media->id]);
});
