<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Support;

/**
 * Pure, framework-agnostic validator for persisted page-builder content
 * (the `PageSchema` shape). Treat builder JSON like a public API: it must be
 * validated at the trust boundary before it is stored.
 *
 * Returns a flat list of human-readable error strings; an empty list means the
 * schema is structurally valid. This class performs no I/O and has no Laravel
 * dependencies so it can be unit-tested in isolation and reused by the
 * SaveBuilderContentRequest FormRequest.
 *
 * It deliberately validates only the *envelope* (shape, types, nesting depth,
 * component count) — not per-widget settings semantics, which are the
 * responsibility of each widget's own version/migration logic on the client.
 */
final class PageSchemaValidator
{
    /** Maximum allowed component-tree nesting depth (top level = 1). */
    public const MAX_DEPTH = 20;

    /** Maximum allowed total number of components in a single document. */
    public const MAX_COMPONENTS = 500;

    /** Stop collecting once this many errors are found, to bound response size. */
    private const MAX_ERRORS = 100;

    /**
     * @param  array<mixed>  $content  The decoded builder content (PageSchema).
     * @return list<string> Validation errors; empty when the schema is valid.
     */
    public function validate(array $content): array
    {
        $errors = [];

        if (! array_key_exists('schemaVersion', $content) || ! is_int($content['schemaVersion'])) {
            $errors[] = 'schemaVersion must be an integer.';
        }

        if (! array_key_exists('components', $content) || ! is_array($content['components'])) {
            $errors[] = 'components must be an array.';

            return $errors;
        }

        $count = 0;
        $this->walk($content['components'], 1, $errors, $count, 'components');

        if ($count > self::MAX_COMPONENTS) {
            $errors[] = sprintf('Component count (%d) exceeds the maximum of %d.', $count, self::MAX_COMPONENTS);
        }

        return $errors;
    }

    /**
     * Recursively validate a list of components.
     *
     * @param  array<mixed>  $components
     * @param  list<string>  $errors
     */
    private function walk(array $components, int $depth, array &$errors, int &$count, string $path): void
    {
        if ($depth > self::MAX_DEPTH) {
            $errors[] = sprintf('Nesting depth exceeds the maximum of %d at %s.', self::MAX_DEPTH, $path);

            return;
        }

        foreach ($components as $index => $component) {
            // Bail out of pathological payloads early — both for error-list size
            // and to avoid traversing an oversized tree.
            if (count($errors) >= self::MAX_ERRORS || $count > self::MAX_COMPONENTS) {
                return;
            }

            $componentPath = sprintf('%s[%s]', $path, (string) $index);

            if (! is_array($component)) {
                $errors[] = sprintf('%s must be an object.', $componentPath);

                continue;
            }

            $count++;

            if (! isset($component['id']) || ! is_string($component['id']) || $component['id'] === '') {
                $errors[] = sprintf('%s.id must be a non-empty string.', $componentPath);
            }

            if (! isset($component['type']) || ! is_string($component['type']) || $component['type'] === '') {
                $errors[] = sprintf('%s.type must be a non-empty string.', $componentPath);
            }

            if (! array_key_exists('version', $component) || ! is_int($component['version'])) {
                $errors[] = sprintf('%s.version must be an integer.', $componentPath);
            }

            if (! array_key_exists('settings', $component) || ! is_array($component['settings'])) {
                $errors[] = sprintf('%s.settings must be an object.', $componentPath);
            }

            if (! array_key_exists('styles', $component) || ! is_array($component['styles'])) {
                $errors[] = sprintf('%s.styles must be an object.', $componentPath);
            }

            if (array_key_exists('children', $component)) {
                if (! is_array($component['children'])) {
                    $errors[] = sprintf('%s.children must be an array.', $componentPath);
                } else {
                    $this->walk($component['children'], $depth + 1, $errors, $count, $componentPath.'.children');
                }
            }
        }
    }
}
