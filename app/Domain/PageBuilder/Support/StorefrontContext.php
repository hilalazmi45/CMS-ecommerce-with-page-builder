<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Support;

/**
 * Request-scoped service that describes which "page context" the current
 * storefront request represents.  Each storefront controller calls exactly
 * one setter.  The ConditionResolver reads the state to decide which
 * ThemeTemplate best matches the current page.
 *
 * Default (unset) state → only `entire_site` rules match.
 */
final class StorefrontContext
{
    private string $type = 'default';

    /** entity name: 'product' | 'cms_page' */
    private string $entity = '';

    private int $entityId = 0;

    // ─── Setters (called by storefront controllers) ───────────────────────────

    public function setFrontPage(): void
    {
        $this->type = 'front_page';
        $this->entity = '';
        $this->entityId = 0;
    }

    /**
     * @param  string  $entity  'product' | 'cms_page'
     */
    public function setSingular(string $entity, int $id): void
    {
        $this->type = 'singular';
        $this->entity = $entity;
        $this->entityId = $id;
    }

    /**
     * @param  string  $entity  'product_category' | 'product_brand'
     */
    public function setArchive(string $entity, int $id): void
    {
        $this->type = 'archive';
        $this->entity = $entity;
        $this->entityId = $id;
    }

    public function setNotFound(): void
    {
        $this->type = 'e404';
        $this->entity = '';
        $this->entityId = 0;
    }

    // ─── Getters ─────────────────────────────────────────────────────────────

    public function getType(): string
    {
        return $this->type;
    }

    public function getEntity(): string
    {
        return $this->entity;
    }

    public function getEntityId(): int
    {
        return $this->entityId;
    }

    // ─── Rule matching ────────────────────────────────────────────────────────

    /**
     * Return true when this context satisfies the given rule string.
     *
     * Supported rule formats:
     *   entire_site
     *   front_page
     *   e404
     *   singular:<entity>           e.g. singular:product
     *   singular:<entity>:<id>      e.g. singular:product:42
     *   archive:<entity>            e.g. archive:product_category
     *   archive:<entity>:<id>       e.g. archive:product_category:7
     */
    public function matchesRule(string $rule): bool
    {
        if ($rule === 'entire_site') {
            return true;
        }

        if ($rule === 'front_page') {
            return $this->type === 'front_page';
        }

        if ($rule === 'e404') {
            return $this->type === 'e404';
        }

        if (str_starts_with($rule, 'singular:')) {
            if ($this->type !== 'singular') {
                return false;
            }

            $parts = explode(':', $rule);
            // parts[0] = 'singular', parts[1] = entity, parts[2]? = id
            $ruleEntity = $parts[1] ?? '';

            if ($this->entity !== $ruleEntity) {
                return false;
            }

            if (isset($parts[2]) && $parts[2] !== '') {
                return $this->entityId === (int) $parts[2];
            }

            return true; // entity wildcard
        }

        if (str_starts_with($rule, 'archive:')) {
            if ($this->type !== 'archive') {
                return false;
            }

            $parts = explode(':', $rule);
            $ruleEntity = $parts[1] ?? '';

            if ($this->entity !== $ruleEntity) {
                return false;
            }

            if (isset($parts[2]) && $parts[2] !== '') {
                return $this->entityId === (int) $parts[2];
            }

            return true; // entity wildcard
        }

        return false;
    }

    /**
     * Specificity score for a rule string that already matched.
     * Higher = more specific.
     *
     *   singular/archive with id  → 30
     *   singular/archive wildcard → 20
     *   front_page / e404         → 10
     *   entire_site               → 0
     */
    public static function ruleSpecificity(string $rule): int
    {
        if ($rule === 'entire_site') {
            return 0;
        }

        if ($rule === 'front_page' || $rule === 'e404') {
            return 10;
        }

        $parts = explode(':', $rule);

        if (count($parts) >= 3 && $parts[2] !== '') {
            return 30; // has explicit id
        }

        return 20; // wildcard singular/archive
    }
}
