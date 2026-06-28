/**
 * Copy/paste helpers for the page builder.
 *
 * Uses navigator.clipboard when available (browser, user-granted permission).
 * Falls back to an in-memory variable so the feature still works in
 * environments where the clipboard API is unavailable (iframe, SSR).
 */

import type { PageComponent } from './types';

// ─── ID regeneration ─────────────────────────────────────────────────────────

/**
 * Deep-clone a PageComponent tree, assigning fresh IDs to every node.
 * Pure function — no side-effects.
 */
export function cloneWithNewIds(node: PageComponent): PageComponent {
    const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
        ...node,
        id: newId,
        children: node.children ? node.children.map(cloneWithNewIds) : node.children,
    };
}

// ─── Serialisation / deserialisation ─────────────────────────────────────────

const CLIPBOARD_MARKER = '__builder_component__';

interface ClipboardPayload {
    __marker: typeof CLIPBOARD_MARKER;
    component: PageComponent;
}

export function serializeComponent(component: PageComponent): string {
    const payload: ClipboardPayload = { __marker: CLIPBOARD_MARKER, component };
    return JSON.stringify(payload);
}

/**
 * Parse a clipboard string.
 * Returns null when the payload is missing, malformed, or not a builder component.
 */
export function deserializeComponent(raw: string): PageComponent | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            '__marker' in parsed &&
            (parsed as Record<string, unknown>)['__marker'] === CLIPBOARD_MARKER &&
            'component' in parsed
        ) {
            return (parsed as ClipboardPayload).component;
        }
    } catch {
        // not a builder payload
    }
    return null;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

let memoryClipboard: string | null = null;

// ─── Clipboard API wrappers ───────────────────────────────────────────────────

/**
 * Write a component to the system clipboard (with in-memory fallback).
 * SSR-safe: no-op on the server.
 */
export async function writeComponentToClipboard(component: PageComponent): Promise<void> {
    const text = serializeComponent(component);
    memoryClipboard = text; // always keep in-memory copy as fallback
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Permission denied or unavailable — memory fallback already set
    }
}

/**
 * Read a component from the system clipboard (with in-memory fallback).
 * Returns null when no builder component is found.
 * SSR-safe.
 */
export async function readComponentFromClipboard(): Promise<PageComponent | null> {
    // Try system clipboard first
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = deserializeComponent(text);
            if (parsed) return parsed;
        } catch {
            // Permission denied — fall through to memory fallback
        }
    }
    // Fall back to in-memory
    if (memoryClipboard) {
        return deserializeComponent(memoryClipboard);
    }
    return null;
}
