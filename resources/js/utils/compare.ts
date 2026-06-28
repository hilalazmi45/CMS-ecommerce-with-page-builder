/**
 * Compare utility — client-only, localStorage-backed.
 *
 * SSR-safe: all window/localStorage access is guarded by
 * `typeof window !== 'undefined'` checks so this module can be imported
 * during server-side rendering without errors.
 *
 * Maximum 4 products can be compared at once (Elementor / WooCommerce parity).
 */

const STORAGE_KEY = 'compare_ids';
const MAX_COMPARE = 4;
const EVENT_NAME = 'compare:change';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readStorage(): number[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is number => typeof v === 'number' && v > 0);
    } catch {
        return [];
    }
}

function writeStorage(ids: number[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // localStorage may be unavailable (private mode quota exceeded, etc.)
    }
}

function emit(ids: number[]): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<{ ids: number[] }>(EVENT_NAME, { detail: { ids } }),
    );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the current list of product IDs being compared.
 * Returns an empty array during SSR.
 */
export function getCompareIds(): number[] {
    return readStorage();
}

/**
 * Toggle a product ID in/out of the compare list.
 * Capped at MAX_COMPARE (4). Returns the new list.
 * Emits a `compare:change` CustomEvent on the window.
 */
export function toggleCompare(id: number): number[] {
    if (typeof window === 'undefined') return [];

    const current = readStorage();
    let next: number[];

    if (current.includes(id)) {
        next = current.filter((v) => v !== id);
    } else if (current.length >= MAX_COMPARE) {
        // Already at max — do nothing, return unchanged.
        return current;
    } else {
        next = [...current, id];
    }

    writeStorage(next);
    emit(next);
    return next;
}

/**
 * Remove a product ID from the compare list.
 * No-op if the ID is not present.
 */
export function removeFromCompare(id: number): number[] {
    if (typeof window === 'undefined') return [];

    const next = readStorage().filter((v) => v !== id);
    writeStorage(next);
    emit(next);
    return next;
}

/**
 * Clear the entire compare list.
 */
export function clearCompare(): void {
    if (typeof window === 'undefined') return;
    writeStorage([]);
    emit([]);
}

/**
 * Subscribe to compare list changes.
 *
 * @param cb  Called with the new ID list whenever it changes.
 * @returns   An unsubscribe function (call it in a useEffect cleanup).
 *
 * @example
 * useEffect(() => {
 *   return onCompareChange(setCompareIds);
 * }, []);
 */
export function onCompareChange(cb: (ids: number[]) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const handler = (e: Event): void => {
        const detail = (e as CustomEvent<{ ids: number[] }>).detail;
        cb(detail.ids);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
