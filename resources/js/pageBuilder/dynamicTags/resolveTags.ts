/**
 * resolveTags — replaces `{key}` tokens in a string with live values.
 *
 * Rules:
 * - Only recognised tag keys are substituted; unknown tokens are left as-is
 *   so authors can spot typos rather than silently seeing blank output.
 * - Tokens are matched case-sensitively (e.g. `{product.title}` not `{Product.Title}`).
 * - If the tag resolves to an empty string the token is replaced with an empty
 *   string (graceful degradation — e.g. `{product.title}` outside a product page).
 * - The function is pure and has no side-effects; safe to call during SSR.
 */

import { tagMap } from './internal';
import type { DynamicTagContext } from './types';

// ─── Token pattern ────────────────────────────────────────────────────────────

/** Matches `{any.key}` tokens. Capture group 1 = the key. */
const TOKEN_RE = /\{([a-z][a-z0-9._-]*)\}/g;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Replace all `{key}` tokens in `text` using the provided context.
 *
 * @param text - Raw text that may contain zero or more `{key}` tokens.
 * @param ctx  - Runtime context (storefront data, page title, site name).
 * @returns    - The text with all known tokens replaced.
 */
export function resolveTags(text: string, ctx: DynamicTagContext): string {
    if (!text.includes('{')) return text; // fast-path: no tokens at all

    return text.replace(TOKEN_RE, (_match, key: string) => {
        const tag = tagMap.get(key);
        return tag ? tag.resolve(ctx) : _match; // keep unknown tokens intact
    });
}

/**
 * Returns true if `text` contains at least one `{key}` token.
 * Useful for deciding whether to show the "Dynamic" toggle in the settings panel.
 */
export function hasTags(text: string): boolean {
    TOKEN_RE.lastIndex = 0;
    return TOKEN_RE.test(text);
}
