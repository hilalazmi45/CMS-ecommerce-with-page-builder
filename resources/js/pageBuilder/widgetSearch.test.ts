/**
 * Unit tests for widgetSearch pure helpers (A1).
 * These are pure functions — no DOM, no localStorage side-effects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    filterWidgets,
    loadFavorites,
    saveFavorites,
    toggleFavorite,
    loadCollapsedCategories,
    saveCollapsedCategories,
} from './widgetSearch';
import type { WidgetDefinition } from './types';

// ─── Minimal WidgetDefinition stub ───────────────────────────────────────────

// Minimal stub — component slots are cast once at definition; cast is unavoidable
// because React.ComponentType<…> does not accept `() => null` without coercion.
const noop = (() => null) as unknown;

function makeWidget(type: string, label: string): WidgetDefinition {
    return {
        type,
        version: 1,
        category: 'basic',
        label,
        icon: 'X',
        defaultSettings: {},
        defaultStyles: {},
        hasChildren: false,
        EditorComponent: noop as WidgetDefinition['EditorComponent'],
        PreviewComponent: noop as WidgetDefinition['PreviewComponent'],
        SettingsPanel: noop as WidgetDefinition['SettingsPanel'],
    };
}

const WIDGETS = [
    makeWidget('heading', 'Heading'),
    makeWidget('text', 'Text'),
    makeWidget('button', 'Button'),
    makeWidget('product-grid', 'Product Grid'),
    makeWidget('image', 'Image'),
];

// ─── filterWidgets ────────────────────────────────────────────────────────────

describe('filterWidgets', () => {
    it('returns all widgets for an empty query', () => {
        expect(filterWidgets(WIDGETS, '')).toHaveLength(WIDGETS.length);
    });

    it('returns all widgets for a whitespace-only query', () => {
        expect(filterWidgets(WIDGETS, '   ')).toHaveLength(WIDGETS.length);
    });

    it('filters case-insensitively', () => {
        const upper = filterWidgets(WIDGETS, 'HEADING');
        expect(upper).toHaveLength(1);
        expect(upper[0]!.type).toBe('heading');

        const lower = filterWidgets(WIDGETS, 'heading');
        expect(lower).toHaveLength(1);
        expect(lower[0]!.type).toBe('heading');

        const mixed = filterWidgets(WIDGETS, 'HeAdInG');
        expect(mixed).toHaveLength(1);
        expect(mixed[0]!.type).toBe('heading');
    });

    it('matches substring', () => {
        const results = filterWidgets(WIDGETS, 'grid');
        expect(results).toHaveLength(1);
        expect(results[0]!.type).toBe('product-grid');
    });

    it('returns multiple matches', () => {
        // 'g' appears in Heading, Image, Product Grid — test substring match
        const results = filterWidgets(WIDGETS, 'g');
        const labels = results.map((w) => w.label);
        expect(labels).toContain('Heading');
        expect(labels).toContain('Image');
        expect(labels).toContain('Product Grid');
    });

    it('returns empty array when no match', () => {
        expect(filterWidgets(WIDGETS, 'zzz-no-match')).toHaveLength(0);
    });
});

// ─── toggleFavorite ───────────────────────────────────────────────────────────

describe('toggleFavorite', () => {
    it('adds a new favorite', () => {
        const favs = new Set<string>();
        const next = toggleFavorite(favs, 'heading');
        expect(next.has('heading')).toBe(true);
    });

    it('removes an existing favorite', () => {
        const favs = new Set(['heading', 'text']);
        const next = toggleFavorite(favs, 'heading');
        expect(next.has('heading')).toBe(false);
        expect(next.has('text')).toBe(true);
    });

    it('does not mutate the original set', () => {
        const favs = new Set(['heading']);
        const next = toggleFavorite(favs, 'heading');
        expect(favs.has('heading')).toBe(true); // original unchanged
        expect(next.has('heading')).toBe(false);
    });
});

// ─── localStorage helpers ─────────────────────────────────────────────────────

describe('localStorage helpers', () => {
    const store: Record<string, string> = {};

    beforeEach(() => {
        // Clear the in-memory store
        for (const k of Object.keys(store)) { delete store[k]; }

        vi.stubGlobal('window', {});
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v; },
            removeItem: (k: string) => { delete store[k]; },
        });
    });

    it('loadFavorites returns empty Set when nothing stored', () => {
        expect(loadFavorites().size).toBe(0);
    });

    it('saveFavorites then loadFavorites round-trips correctly', () => {
        const favs = new Set(['heading', 'button']);
        saveFavorites(favs);
        const loaded = loadFavorites();
        expect(loaded.has('heading')).toBe(true);
        expect(loaded.has('button')).toBe(true);
        expect(loaded.size).toBe(2);
    });

    it('loadCollapsedCategories returns empty Set when nothing stored', () => {
        expect(loadCollapsedCategories().size).toBe(0);
    });

    it('saveCollapsedCategories then loadCollapsedCategories round-trips correctly', () => {
        const collapsed = new Set(['layout', 'commerce']);
        saveCollapsedCategories(collapsed);
        const loaded = loadCollapsedCategories();
        expect(loaded.has('layout')).toBe(true);
        expect(loaded.has('commerce')).toBe(true);
        expect(loaded.size).toBe(2);
    });

    it('loadFavorites returns empty Set for malformed JSON', () => {
        store['builder:favorites'] = 'not-json{{{';
        expect(loadFavorites().size).toBe(0);
    });

    it('loadFavorites returns empty Set when stored value is not an array', () => {
        store['builder:favorites'] = JSON.stringify({ foo: 'bar' });
        expect(loadFavorites().size).toBe(0);
    });
});
