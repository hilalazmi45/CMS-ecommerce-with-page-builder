/**
 * Lightweight mini-cart coordination via browser CustomEvents.
 *
 * Using a thin module-level event bus avoids introducing a global state library
 * while still allowing the HeaderCartWidget (deep inside the page builder widget
 * tree) to open the MiniCartDrawer (mounted once in StorefrontLayout).
 *
 * All window access is guarded for SSR safety.
 */

const MINI_CART_OPEN_EVENT = 'mini-cart:open' as const;

/**
 * Dispatch the mini-cart open event.
 * Safe to call from SSR context — does nothing server-side.
 */
export function openMiniCart(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MINI_CART_OPEN_EVENT));
}

/**
 * Subscribe to the mini-cart open event.
 *
 * Returns an unsubscribe function. Call it inside a useEffect cleanup.
 *
 * Safe to call from SSR context — returns a no-op unsubscribe function.
 */
export function onMiniCartOpen(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    window.addEventListener(MINI_CART_OPEN_EVENT, cb);
    return () => window.removeEventListener(MINI_CART_OPEN_EVENT, cb);
}
