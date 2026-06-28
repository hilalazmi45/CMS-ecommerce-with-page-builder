/**
 * Unit tests for clipboard pure helpers (A8).
 * Tests serializeComponent, deserializeComponent, and cloneWithNewIds.
 * Async clipboard API tests use a stub — no real browser clipboard.
 */

import { describe, it, expect } from 'vitest';
import {
    cloneWithNewIds,
    serializeComponent,
    deserializeComponent,
} from './clipboard';
import type { PageComponent } from './types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeComponent(overrides: Partial<PageComponent> = {}): PageComponent {
    return {
        id: 'heading-1234-abc',
        type: 'heading',
        version: 1,
        settings: { text: 'Hello', tag: 'h2' },
        styles: { desktop: { color: '#111' } },
        ...overrides,
    };
}

// ─── cloneWithNewIds ──────────────────────────────────────────────────────────

describe('cloneWithNewIds', () => {
    it('assigns a new id to a leaf component', () => {
        const original = makeComponent();
        const clone = cloneWithNewIds(original);
        expect(clone.id).not.toBe(original.id);
        expect(clone.id).toMatch(/^heading-/);
    });

    it('preserves all settings and styles', () => {
        const original = makeComponent();
        const clone = cloneWithNewIds(original);
        expect(clone.settings).toEqual(original.settings);
        expect(clone.styles).toEqual(original.styles);
        expect(clone.type).toBe(original.type);
        expect(clone.version).toBe(original.version);
    });

    it('recursively assigns new ids to children', () => {
        const child1 = makeComponent({ id: 'text-child-1', type: 'text' });
        const child2 = makeComponent({ id: 'image-child-2', type: 'image' });
        const parent = makeComponent({
            id: 'section-parent',
            type: 'section',
            children: [child1, child2],
        });
        const clone = cloneWithNewIds(parent);

        expect(clone.id).not.toBe('section-parent');
        expect(clone.children).toHaveLength(2);
        expect(clone.children![0]!.id).not.toBe('text-child-1');
        expect(clone.children![1]!.id).not.toBe('image-child-2');
    });

    it('does not mutate the original component', () => {
        const original = makeComponent();
        const originalId = original.id;
        cloneWithNewIds(original);
        expect(original.id).toBe(originalId);
    });

    it('two consecutive clones produce different ids', () => {
        const original = makeComponent();
        const clone1 = cloneWithNewIds(original);
        const clone2 = cloneWithNewIds(original);
        expect(clone1.id).not.toBe(clone2.id);
    });

    it('handles undefined children gracefully', () => {
        const original = makeComponent({ children: undefined });
        const clone = cloneWithNewIds(original);
        expect(clone.children).toBeUndefined();
    });
});

// ─── serializeComponent / deserializeComponent ───────────────────────────────

describe('serializeComponent / deserializeComponent round-trip', () => {
    it('serialises and deserialises a component', () => {
        const original = makeComponent();
        const json = serializeComponent(original);
        const restored = deserializeComponent(json);
        expect(restored).toEqual(original);
    });

    it('returns null for an empty string', () => {
        expect(deserializeComponent('')).toBeNull();
    });

    it('returns null for arbitrary JSON without the marker', () => {
        expect(deserializeComponent(JSON.stringify({ foo: 'bar' }))).toBeNull();
    });

    it('returns null for non-JSON input', () => {
        expect(deserializeComponent('not json !!!')).toBeNull();
    });

    it('returns null when __marker is present but wrong', () => {
        const payload = JSON.stringify({ __marker: '__wrong__', component: makeComponent() });
        expect(deserializeComponent(payload)).toBeNull();
    });

    it('preserves nested children through round-trip', () => {
        const child = makeComponent({ id: 'text-child', type: 'text' });
        const parent = makeComponent({ id: 'section-parent', type: 'section', children: [child] });
        const json = serializeComponent(parent);
        const restored = deserializeComponent(json);
        expect(restored?.children).toHaveLength(1);
        expect(restored?.children![0]!.id).toBe('text-child');
    });
});
