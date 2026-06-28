<?php

declare(strict_types=1);

use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Support\PageSchemaValidator;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

/** Create a verified admin user holding the given permission codes. */
function builderUser(string ...$codes): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 2]);

    foreach ($codes as $code) {
        $role->permissions()->attach(Permission::factory()->code($code)->create());
    }

    $user->roles()->attach($role);

    return $user;
}

function builderPage(): CmsPage
{
    return CmsPage::create([
        'title' => 'Landing',
        'slug' => 'landing-'.uniqid(),
        'status' => 'draft',
    ]);
}

/** @return array<string, mixed> */
function validSchema(): array
{
    return [
        'schemaVersion' => 1,
        'components' => [[
            'id' => 'heading-1',
            'type' => 'heading',
            'version' => 1,
            'settings' => ['text' => 'Hi'],
            'styles' => ['desktop' => []],
        ]],
    ];
}

function saveUrl(CmsPage $page): string
{
    return route('admin.builder.save', ['page', $page->ulid]);
}

it('rejects an unauthenticated save', function () {
    $page = builderPage();

    $this->post(saveUrl($page), ['content' => validSchema()])
        ->assertRedirect(route('login'));
});

it('forbids a user without cms.update', function () {
    $user = builderUser('cms.view');
    $page = builderPage();

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => validSchema()])
        ->assertForbidden();
});

it('saves valid content and writes a revision', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => validSchema(), 'label' => 'Manual'])
        ->assertOk()
        ->assertJson(['ok' => true]);

    $page->refresh();
    expect($page->builder_content['schemaVersion'])->toBe(1);

    $this->assertDatabaseHas('builder_revisions', [
        'owner_type' => CmsPage::class,
        'owner_id' => $page->id,
        'label' => 'Manual',
    ]);
});

it('rejects a payload missing schemaVersion', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => ['components' => []]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('content.schemaVersion');
});

it('rejects components with the wrong shape', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $payload = [
        'content' => [
            'schemaVersion' => 1,
            'components' => [['id' => '', 'type' => '', 'settings' => 'x']],
        ],
    ];

    $this->actingAs($user)
        ->postJson(saveUrl($page), $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors('content');
});

it('rejects a tree deeper than the maximum depth', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $node = ['id' => 'n', 'type' => 'section', 'version' => 1, 'settings' => [], 'styles' => []];
    for ($i = 0; $i < PageSchemaValidator::MAX_DEPTH + 2; $i++) {
        $node = ['id' => "n{$i}", 'type' => 'section', 'version' => 1, 'settings' => [], 'styles' => [], 'children' => [$node]];
    }

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => ['schemaVersion' => 1, 'components' => [$node]]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('content');
});

it('rejects more components than the maximum count', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $components = [];
    for ($i = 0; $i <= PageSchemaValidator::MAX_COMPONENTS + 1; $i++) {
        $components[] = ['id' => "c{$i}", 'type' => 'heading', 'version' => 1, 'settings' => [], 'styles' => []];
    }

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => ['schemaVersion' => 1, 'components' => $components]])
        ->assertStatus(422)
        ->assertJsonValidationErrors('content');
});

it('still accepts a valid empty-components document', function () {
    $user = builderUser('cms.update');
    $page = builderPage();

    $this->actingAs($user)
        ->postJson(saveUrl($page), ['content' => ['schemaVersion' => 1, 'components' => []]])
        ->assertOk();
});
