/**
 * Dynamic Tags — type contracts.
 *
 * A DynamicTagContext carries the runtime data available for tag resolution.
 * Tags are written in templates as `{namespace.field}`, e.g. `{product.title}`.
 *
 * Widgets that opt-in to dynamic content pass their raw text through
 * `resolveTags(text, context)` before rendering.
 */

import type { StorefrontContextValue } from '@/pageBuilder/render/StorefrontContext';

// ─── Resolution context ──────────────────────────────────────────────────────

export interface DynamicTagContext {
    storefront: StorefrontContextValue;
    /**
     * Current page title — supplied by the enclosing page's `<Head title="…">`
     * or by the storefront controller via Inertia shared props.
     */
    pageTitle?: string;
    /** Site name from the Vite env var (VITE_APP_NAME). */
    siteName?: string;
}

// ─── Tag definition ──────────────────────────────────────────────────────────

export interface DynamicTag {
    /** Unique identifier, e.g. "product.title". Used as the token `{product.title}`. */
    key: string;
    /** Human-readable label shown in the tag picker. */
    label: string;
    /** Short description of what this tag resolves to. */
    description: string;
    /** Category for grouping in the tag picker UI. */
    category: 'product' | 'site' | 'page' | 'date';
    /**
     * Resolves the tag to its string value. Returns an empty string when the
     * data is not available in the current context (e.g. `{product.title}` on
     * a non-product page) so rendering degrades gracefully.
     */
    resolve(ctx: DynamicTagContext): string;
}
