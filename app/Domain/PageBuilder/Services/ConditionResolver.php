<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Services;

use App\Domain\PageBuilder\Models\ThemeTemplate;
use App\Domain\PageBuilder\Support\StorefrontContext;
use Illuminate\Database\Eloquent\Collection;

/**
 * Resolves which active ThemeTemplate of a given type best matches the
 * current storefront context using Elementor-style display conditions.
 *
 * Conditions data shape (stored in the `conditions` JSON column):
 *   [ { "mode": "include"|"exclude", "rule": "<rule-string>" }, … ]
 *
 * A template with NULL or empty conditions is treated as `entire_site` include
 * (backward-compatible with templates created before this feature).
 *
 * Resolution algorithm:
 *   1. Collect all active templates of the requested type.
 *   2. Keep those that pass: ≥1 include rule matches AND no exclude rule matches.
 *   3. Among passing templates, pick the one with the highest specificity score
 *      (score = max specificity of any matched include rule).
 *   4. Tie-break: most recently updated (updated_at DESC), then id DESC.
 */
final class ConditionResolver
{
    /**
     * Resolve the best-matching active ThemeTemplate.
     */
    public function resolve(string $type, StorefrontContext $context): ?ThemeTemplate
    {
        /** @var Collection<int, ThemeTemplate> $candidates */
        $candidates = ThemeTemplate::query()
            ->active()
            ->ofType($type)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();

        $best = null;
        $bestScore = -1;

        foreach ($candidates as $template) {
            [$passes, $score] = $this->evaluate($template, $context);

            if (! $passes) {
                continue;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $template;
            }
        }

        return $best;
    }

    /**
     * Convenience wrapper that returns the resolved template's `content` array,
     * or null when no template matches.
     *
     * @return array<string, mixed>|null
     */
    public function matchedContent(string $type, StorefrontContext $context): ?array
    {
        return $this->resolve($type, $context)?->content;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /**
     * Evaluate one template against the context.
     *
     * @return array{bool, int} [passes, specificity-score]
     */
    private function evaluate(ThemeTemplate $template, StorefrontContext $context): array
    {
        $conditions = $template->conditions;

        // Null or empty conditions → treat as entire_site include.
        if (empty($conditions)) {
            return [
                $context->matchesRule('entire_site'),
                StorefrontContext::ruleSpecificity('entire_site'),
            ];
        }

        $includeScore = -1; // -1 means "no include rule matched yet"
        $excluded = false;

        foreach ($conditions as $condition) {
            $mode = $condition['mode'] ?? 'include';
            $rule = $condition['rule'] ?? '';

            if (! $context->matchesRule($rule)) {
                continue;
            }

            if ($mode === 'exclude') {
                $excluded = true;
                break; // an exclude match disqualifies immediately
            }

            // mode === 'include'
            $score = StorefrontContext::ruleSpecificity($rule);
            if ($score > $includeScore) {
                $includeScore = $score;
            }
        }

        if ($excluded || $includeScore < 0) {
            return [false, 0];
        }

        return [true, $includeScore];
    }
}
