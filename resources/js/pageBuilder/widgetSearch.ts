/**
 * Pure helpers for widget palette search and favorites.
 * All localStorage access is SSR-guarded.
 */

import type { WidgetDefinition } from './types';

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Filter a list of widget definitions by label (case-insensitive substring).
 * Returns all widgets when query is empty or whitespace-only.
 */
export function filterWidgets(widgets: WidgetDefinition[], query: string): WidgetDefinition[] {
    const q = query.trim().toLowerCase();
    if (!q) return widgets;
    return widgets.filter((w) => w.label.toLowerCase().includes(q));
}

// ─── Category collapse state ──────────────────────────────────────────────────

const CATEGORY_COLLAPSE_KEY = 'builder:category-collapsed';

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

export function loadCollapsedCategories(): Set<string> {
    if (!isBrowser()) return new Set();
    try {
        const raw = localStorage.getItem(CATEGORY_COLLAPSE_KEY);
        if (!raw) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter((v): v is string => typeof v === 'string'));
        }
    } catch {
        // ignore malformed storage
    }
    return new Set();
}

export function saveCollapsedCategories(collapsed: Set<string>): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(CATEGORY_COLLAPSE_KEY, JSON.stringify(Array.from(collapsed)));
    } catch {
        // ignore quota errors
    }
}

// ─── Favorites ─────────────────────────────────────────────────────────────────

const FAVORITES_KEY = 'builder:favorites';

export function loadFavorites(): Set<string> {
    if (!isBrowser()) return new Set();
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (!raw) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter((v): v is string => typeof v === 'string'));
        }
    } catch {
        // ignore malformed storage
    }
    return new Set();
}

export function saveFavorites(favs: Set<string>): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favs)));
    } catch {
        // ignore quota errors
    }
}

export function toggleFavorite(favs: Set<string>, type: string): Set<string> {
    const next = new Set(favs);
    if (next.has(type)) {
        next.delete(type);
    } else {
        next.add(type);
    }
    return next;
}
