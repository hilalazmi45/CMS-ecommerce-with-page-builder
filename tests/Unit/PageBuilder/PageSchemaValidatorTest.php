<?php

declare(strict_types=1);

use App\Domain\PageBuilder\Support\PageSchemaValidator;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function validComponent(array $overrides = []): array
{
    return array_merge([
        'id' => 'heading-1',
        'type' => 'heading',
        'version' => 1,
        'settings' => ['text' => 'Hello'],
        'styles' => ['desktop' => []],
    ], $overrides);
}

it('accepts a valid schema', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent()],
    ]);

    expect($errors)->toBe([]);
});

it('accepts a component without children (leaf widget)', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent()],
    ]);

    expect($errors)->toBe([]);
});

it('accepts styles serialized as an empty array (PHP empty object)', function () {
    // Mirrors real stored data where styles.desktop is `[]` after json round-trip.
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent(['styles' => []])],
    ]);

    expect($errors)->toBe([]);
});

it('rejects a non-integer schemaVersion', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => '1',
        'components' => [],
    ]);

    expect($errors)->toContain('schemaVersion must be an integer.');
});

it('rejects components that are not an array', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => 'nope',
    ]);

    expect($errors)->toContain('components must be an array.');
});

it('rejects a component missing a valid id', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent(['id' => ''])],
    ]);

    expect($errors)->toContain('components[0].id must be a non-empty string.');
});

it('rejects a component with a non-array settings field', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent(['settings' => 'x'])],
    ]);

    expect($errors)->toContain('components[0].settings must be an object.');
});

it('rejects a component with a non-integer version', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent(['version' => 'v2'])],
    ]);

    expect($errors)->toContain('components[0].version must be an integer.');
});

it('rejects nesting deeper than the maximum depth', function () {
    $node = validComponent();
    for ($i = 0; $i < PageSchemaValidator::MAX_DEPTH + 2; $i++) {
        $node = validComponent(['children' => [$node]]);
    }

    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [$node],
    ]);

    expect($errors)->not->toBe([])
        ->and(implode("\n", $errors))->toContain('Nesting depth exceeds the maximum');
});

it('rejects more components than the maximum count', function () {
    $components = [];
    for ($i = 0; $i <= PageSchemaValidator::MAX_COMPONENTS + 1; $i++) {
        $components[] = validComponent(['id' => "c{$i}"]);
    }

    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => $components,
    ]);

    expect(implode("\n", $errors))->toContain('exceeds the maximum of '.PageSchemaValidator::MAX_COMPONENTS);
});

it('rejects a non-array child collection', function () {
    $errors = (new PageSchemaValidator)->validate([
        'schemaVersion' => 1,
        'components' => [validComponent(['children' => 'oops'])],
    ]);

    expect($errors)->toContain('components[0].children must be an array.');
});
