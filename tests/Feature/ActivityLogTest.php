<?php

declare(strict_types=1);

use App\Domain\Shared\Services\ActivityLogger;
use App\Models\ActivityLog;
use App\Models\Role;
use App\Models\User;

test('ActivityLogger::log creates a record with correct fields', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    ActivityLogger::log(
        module: 'role',
        action: 'created',
        entityType: Role::class,
        entityId: 42,
        oldValues: null,
        newValues: ['name' => 'Editor'],
    );

    $log = ActivityLog::first();

    expect($log)->not->toBeNull()
        ->and($log->module)->toBe('role')
        ->and($log->action)->toBe('created')
        ->and($log->entity_type)->toBe(Role::class)
        ->and($log->entity_id)->toBe(42)
        ->and($log->user_id)->toBe($user->id)
        ->and($log->new_values)->toBe(['name' => 'Editor'])
        ->and($log->old_values)->toBeNull();
});

test('ActivityLogger::log stores old and new values for updates', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    ActivityLogger::log(
        module: 'settings',
        action: 'updated',
        entityType: null,
        entityId: null,
        oldValues: ['site_name' => 'Old Name'],
        newValues: ['site_name' => 'New Name'],
    );

    $log = ActivityLog::first();

    expect($log->old_values)->toBe(['site_name' => 'Old Name'])
        ->and($log->new_values)->toBe(['site_name' => 'New Name']);
});

test('ActivityLogger::log works without an authenticated user', function () {
    ActivityLogger::log('media', 'deleted', null, null, ['file_name' => 'photo.jpg']);

    $log = ActivityLog::first();
    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBeNull()
        ->and($log->module)->toBe('media');
});

test('ActivityLog records do not have an updated_at timestamp column', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    ActivityLogger::log('audit', 'viewed', null, null, null);

    $log = ActivityLog::first();
    expect($log->created_at)->not->toBeNull();

    // The model has $timestamps = false and no updated_at column
    $columns = Schema::getColumnListing('activity_logs');
    expect(in_array('updated_at', $columns))->toBeFalse();
});
