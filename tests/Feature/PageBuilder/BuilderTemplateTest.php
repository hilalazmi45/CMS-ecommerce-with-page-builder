<?php

declare(strict_types=1);

use App\Domain\PageBuilder\Models\PageBuilderTemplate;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a verified admin user with settings.update permission (mirrors what BuilderTemplateController authorizes). */
function templateUser(): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 2]);
    // Use firstOrCreate to avoid unique-code violations across multiple helper calls in one test run.
    $perm = Permission::firstOrCreate(
        ['code' => 'settings.update'],
        ['module' => 'settings', 'action' => 'update', 'description' => 'Update settings'],
    );
    $role->permissions()->attach($perm);
    $user->roles()->attach($role);

    return $user;
}

function validTemplateContent(): array
{
    return [
        'schemaVersion' => 1,
        'components' => [[
            'id' => 'heading-tpl-1',
            'type' => 'heading',
            'version' => 1,
            'settings' => ['text' => 'Template heading'],
            'styles' => ['desktop' => []],
        ]],
    ];
}

// ─── Index ────────────────────────────────────────────────────────────────────

it('rejects unauthenticated access to template index', function () {
    $this->getJson(route('admin.builder.templates.index'))
        ->assertStatus(401);
});

it('rejects a user without settings.update permission', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('admin.builder.templates.index'))
        ->assertStatus(403);
});

it('returns an empty templates list for a new user', function () {
    $user = templateUser();

    $this->actingAs($user)
        ->getJson(route('admin.builder.templates.index'))
        ->assertOk()
        ->assertJsonStructure(['templates'])
        ->assertJson(['templates' => []]);
});

it('returns templates created by the authenticated user', function () {
    $user = templateUser();
    PageBuilderTemplate::factory()->create([
        'name' => 'My Hero',
        'type' => 'section',
        'content' => validTemplateContent(),
        'is_global' => false,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->getJson(route('admin.builder.templates.index'))
        ->assertOk()
        ->assertJsonPath('templates.0.name', 'My Hero');
});

it('returns global templates regardless of creator', function () {
    $owner = templateUser();
    $other = templateUser();

    PageBuilderTemplate::factory()->create([
        'name' => 'Global Banner',
        'type' => 'section',
        'content' => validTemplateContent(),
        'is_global' => true,
        'created_by' => $owner->id,
    ]);

    // Other user should see the global template
    $this->actingAs($other)
        ->getJson(route('admin.builder.templates.index'))
        ->assertOk()
        ->assertJsonPath('templates.0.name', 'Global Banner');
});

it('does not return private templates of another user', function () {
    $owner = templateUser();
    $other = templateUser();

    PageBuilderTemplate::factory()->create([
        'name' => 'Private Section',
        'type' => 'section',
        'content' => validTemplateContent(),
        'is_global' => false,
        'created_by' => $owner->id,
    ]);

    // Other user cannot see the private template
    $response = $this->actingAs($other)
        ->getJson(route('admin.builder.templates.index'))
        ->assertOk();

    $templates = $response->json('templates');
    expect($templates)->toBeEmpty();
});

// ─── Store ────────────────────────────────────────────────────────────────────

it('rejects unauthenticated template store', function () {
    $this->postJson(route('admin.builder.templates.store'), [
        'name' => 'Hero',
        'type' => 'section',
        'content' => validTemplateContent(),
    ])->assertStatus(401);
});

it('rejects template store without permission', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('admin.builder.templates.store'), [
            'name' => 'Hero',
            'type' => 'section',
            'content' => validTemplateContent(),
        ])->assertStatus(403);
});

it('validates required name', function () {
    $user = templateUser();

    $this->actingAs($user)
        ->postJson(route('admin.builder.templates.store'), [
            'name' => '',
            'type' => 'section',
            'content' => validTemplateContent(),
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('validates content structure', function () {
    $user = templateUser();

    $this->actingAs($user)
        ->postJson(route('admin.builder.templates.store'), [
            'name' => 'Hero',
            'type' => 'section',
            'content' => 'not-an-array',
        ])->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

it('creates a template and returns 201 with ulid', function () {
    $user = templateUser();

    $response = $this->actingAs($user)
        ->postJson(route('admin.builder.templates.store'), [
            'name' => 'Hero Section',
            'type' => 'section',
            'content' => validTemplateContent(),
            'is_global' => false,
        ])->assertCreated()
        ->assertJsonStructure(['ok', 'ulid', 'name']);

    expect($response->json('name'))->toBe('Hero Section');

    $this->assertDatabaseHas('page_builder_templates', [
        'name' => 'Hero Section',
        'created_by' => $user->id,
    ]);
});

it('assigns the authenticated user as created_by', function () {
    $user = templateUser();

    $response = $this->actingAs($user)
        ->postJson(route('admin.builder.templates.store'), [
            'name' => 'Footer',
            'type' => 'footer',
            'content' => validTemplateContent(),
        ])->assertCreated();

    $ulid = $response->json('ulid');
    $tpl = PageBuilderTemplate::where('ulid', $ulid)->firstOrFail();
    expect($tpl->created_by)->toBe($user->id);
});

// ─── Destroy ──────────────────────────────────────────────────────────────────

it('allows a user to delete their own template', function () {
    $user = templateUser();
    $tpl = PageBuilderTemplate::factory()->create([
        'name' => 'Deletable',
        'type' => 'section',
        'content' => validTemplateContent(),
        'is_global' => false,
        'created_by' => $user->id,
    ]);

    $this->actingAs($user)
        ->deleteJson(route('admin.builder.templates.destroy', $tpl->ulid))
        ->assertOk()
        ->assertJson(['ok' => true]);

    $this->assertSoftDeleted('page_builder_templates', ['ulid' => $tpl->ulid]);
});

it('prevents a user from deleting another user\'s template', function () {
    $owner = templateUser();
    $other = templateUser();

    $tpl = PageBuilderTemplate::factory()->create([
        'name' => 'Protected',
        'type' => 'section',
        'content' => validTemplateContent(),
        'is_global' => false,
        'created_by' => $owner->id,
    ]);

    $this->actingAs($other)
        ->deleteJson(route('admin.builder.templates.destroy', $tpl->ulid))
        ->assertStatus(403);

    $this->assertNotSoftDeleted('page_builder_templates', ['ulid' => $tpl->ulid]);
});
