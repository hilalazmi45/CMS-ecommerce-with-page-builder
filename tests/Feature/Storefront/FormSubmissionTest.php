<?php

declare(strict_types=1);

use App\Domain\Cms\Models\FormSubmission;

// ---------------------------------------------------------------------------
// 1. Valid submission is stored and returns success flash
// ---------------------------------------------------------------------------

it('valid form submission is stored and redirects with success', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        'fields' => [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'message' => 'Hello there!',
        ],
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('form_submissions', [
        'form_key' => 'contact',
    ]);
});

it('stored submission payload matches submitted fields', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'newsletter',
        'fields' => ['email' => 'reader@example.com'],
        '_hp' => '',
    ]);

    $submission = FormSubmission::where('form_key', 'newsletter')->latest('created_at')->first();

    expect($submission)->not->toBeNull();
    expect($submission->payload)->toMatchArray(['email' => 'reader@example.com']);
});

// ---------------------------------------------------------------------------
// 2. Honeypot filled — rejected silently (no DB record, returns success)
// ---------------------------------------------------------------------------

it('submission with filled honeypot is silently rejected with no DB record', function () {
    $countBefore = FormSubmission::count();

    // The controller returns back()->with('success', true) to confuse bots,
    // but stores nothing in the database.
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        'fields' => ['name' => 'Bot', 'email' => 'bot@spam.com'],
        '_hp' => 'I am a bot',
    ])
        ->assertRedirect()
        ->assertSessionHas('success');

    // No new record should have been created
    expect(FormSubmission::count())->toBe($countBefore);
});

// ---------------------------------------------------------------------------
// 3. Validation errors
// ---------------------------------------------------------------------------

it('form_key is required', function () {
    $this->post(route('storefront.forms.submit'), [
        'fields' => ['name' => 'Alice'],
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHasErrors(['form_key']);
});

it('form_key must be alpha_dash', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'bad key!',
        'fields' => ['name' => 'Alice'],
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHasErrors(['form_key']);
});

it('fields is required', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHasErrors(['fields']);
});

it('empty fields array is rejected', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        'fields' => [],
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHasErrors(['fields']);
});

it('individual field values are truncated to 2000 chars', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        'fields' => ['message' => str_repeat('a', 2001)],
        '_hp' => '',
    ])
        ->assertRedirect()
        ->assertSessionHasErrors(['fields.message']);
});

// ---------------------------------------------------------------------------
// 4. Migration round-trip
// ---------------------------------------------------------------------------

it('form_submissions table exists and ulid is generated on creation', function () {
    $submission = FormSubmission::create([
        'form_key' => 'test_key',
        'payload' => ['foo' => 'bar'],
    ]);

    expect($submission->ulid)->toBeString()->toHaveLength(26);
    expect($submission->payload)->toMatchArray(['foo' => 'bar']);

    $this->assertDatabaseHas('form_submissions', [
        'form_key' => 'test_key',
    ]);
});

it('form_submissions stores ip_address', function () {
    $this->post(route('storefront.forms.submit'), [
        'form_key' => 'contact',
        'fields' => ['name' => 'IP Test'],
        '_hp' => '',
    ]);

    $submission = FormSubmission::where('form_key', 'contact')->latest('created_at')->first();

    expect($submission)->not->toBeNull();
    expect($submission->ip_address)->toBeString();
});

// ---------------------------------------------------------------------------
// 5. Route exists with correct name
// ---------------------------------------------------------------------------

it('storefront.forms.submit route exists', function () {
    expect(route('storefront.forms.submit'))->toBeString()->toContain('/forms/submit');
});
