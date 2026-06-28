/**
 * Dynamic Tag Registry — all built-in tags are registered here.
 *
 * Tags are resolved by `resolveTags()` which replaces `{key}` tokens in a
 * string with their runtime values. Unknown tokens are left unchanged so
 * authors can see them and correct typos.
 */

import { tagMap } from './internal';
import type { DynamicTag, DynamicTagContext } from './types';

// ─── Built-in tag definitions ────────────────────────────────────────────────

const builtInTags: DynamicTag[] = [
    // Product tags — only meaningful on a single-product page
    {
        key: 'product.title',
        label: 'Product Title',
        description: 'The name of the current product',
        category: 'product',
        resolve: (ctx) => ctx.storefront.currentProduct?.name ?? '',
    },
    {
        key: 'product.price',
        label: 'Product Price',
        description: 'The formatted price of the current product',
        category: 'product',
        resolve: (ctx) => {
            const p = ctx.storefront.currentProduct;
            if (!p) return '';
            const price = p.sale_price ?? p.regular_price;
            if (price === null) return '';
            return new Intl.NumberFormat('ms-MY', {
                style: 'currency',
                currency: 'MYR',
            }).format(price / 100);
        },
    },
    {
        key: 'product.short_description',
        label: 'Product Short Description',
        description: 'The short description of the current product',
        category: 'product',
        resolve: (ctx) => ctx.storefront.currentProduct?.short_description ?? '',
    },
    {
        key: 'product.sku',
        label: 'Product SKU',
        description: 'The SKU of the current product',
        category: 'product',
        resolve: (ctx) => {
            const p = ctx.storefront.currentProduct;
            if (!p) return '';
            // sku is not typed on StorefrontProduct but may be present at runtime
            const asRecord = p as unknown as Record<string, unknown>;
            return typeof asRecord['sku'] === 'string' ? asRecord['sku'] : '';
        },
    },
    // Site tags — always available
    {
        key: 'site.name',
        label: 'Site Name',
        description: 'The name of the site',
        category: 'site',
        resolve: (ctx) => ctx.siteName ?? '',
    },
    // Page tags — supplied by the current page
    {
        key: 'page.title',
        label: 'Page Title',
        description: 'The title of the current page',
        category: 'page',
        resolve: (ctx) => ctx.pageTitle ?? '',
    },
    // Date tags — SSR-safe (new Date() is deterministic for a given request)
    {
        key: 'date',
        label: 'Current Date',
        description: "Today's formatted date",
        category: 'date',
        resolve: () =>
            new Intl.DateTimeFormat('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(new Date()),
    },
    {
        key: 'date.year',
        label: 'Current Year',
        description: 'The current four-digit year',
        category: 'date',
        resolve: () => String(new Date().getFullYear()),
    },
];

// ─── Seed the shared map ──────────────────────────────────────────────────────

for (const tag of builtInTags) {
    tagMap.set(tag.key, tag);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns all registered tags, sorted by category then label. */
export function getAllTags(): DynamicTag[] {
    return Array.from(tagMap.values()).sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.label.localeCompare(b.label);
    });
}

/** Returns tags for a given category. */
export function getTagsByCategory(category: DynamicTag['category']): DynamicTag[] {
    return getAllTags().filter((t) => t.category === category);
}

/** Registers a custom tag. Overwrites an existing tag with the same key. */
export function registerTag(tag: DynamicTag): void {
    tagMap.set(tag.key, tag);
}

// Re-export DynamicTagContext so callers only need one import
export type { DynamicTagContext };
