/**
 * A5 — Entrance animation helpers for the page builder.
 *
 * Keeps the list of supported animations and builds the inline-style /
 * class-name strings consumed by PageRenderer.tsx (storefront) and the
 * AdvancedControls panel (editor). Pure functions — no DOM or browser APIs.
 */

// ─── Supported animation names ─────────────────────────────────────────────

export const ANIMATION_NAMES = [
    'none',
    'fadeIn',
    'fadeInUp',
    'fadeInDown',
    'fadeInLeft',
    'fadeInRight',
    'zoomIn',
    'slideInUp',
    'slideInDown',
    'slideInLeft',
    'slideInRight',
    'bounce',
    'pulse',
    'shake',
    'rubberBand',
    'heartBeat',
    'rollIn',
    'jackInTheBox',
] as const;

export type AnimationName = (typeof ANIMATION_NAMES)[number];

/** Human-readable labels shown in the editor selector. */
export const ANIMATION_LABELS: Record<AnimationName, string> = {
    none: '— None —',
    fadeIn: 'Fade In',
    fadeInUp: 'Fade In Up',
    fadeInDown: 'Fade In Down',
    fadeInLeft: 'Fade In Left',
    fadeInRight: 'Fade In Right',
    zoomIn: 'Zoom In',
    slideInUp: 'Slide In Up',
    slideInDown: 'Slide In Down',
    slideInLeft: 'Slide In Left',
    slideInRight: 'Slide In Right',
    bounce: 'Bounce',
    pulse: 'Pulse',
    shake: 'Shake',
    rubberBand: 'Rubber Band',
    heartBeat: 'Heart Beat',
    rollIn: 'Roll In',
    jackInTheBox: 'Jack In The Box',
};

// ─── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_ANIMATION_DURATION_MS = 600;
export const DEFAULT_ANIMATION_DELAY_MS = 0;

// ─── Helper: resolve animation name ───────────────────────────────────────

/** Returns true when a string is a valid non-empty animation name. */
export function isValidAnimation(name: unknown): name is Exclude<AnimationName, 'none'> {
    return (
        typeof name === 'string' &&
        name !== 'none' &&
        (ANIMATION_NAMES as readonly string[]).includes(name)
    );
}

// ─── Helper: build CSS var inline style for PageRenderer ──────────────────

export interface AnimationStyle {
    /** CSS vars to set as inline style props, e.g. { '--anim-duration': '600ms' } */
    cssVars: Record<string, string>;
    /** Class names to add unconditionally (trigger class added by IntersectionObserver) */
    staticClasses: string;
}

/**
 * Given a component's animation settings, return the CSS vars and static
 * class string that PageRenderer should apply to the element's wrapper.
 *
 * Returns null when no animation is configured (settings._animation is absent
 * or 'none'), so callers can skip the observer entirely.
 */
export function buildAnimationProps(
    animName: unknown,
    durationMs: unknown,
    delayMs: unknown,
): AnimationStyle | null {
    if (!isValidAnimation(animName)) return null;

    const dur = typeof durationMs === 'number' && durationMs > 0 ? durationMs : DEFAULT_ANIMATION_DURATION_MS;
    const del = typeof delayMs === 'number' && delayMs >= 0 ? delayMs : DEFAULT_ANIMATION_DELAY_MS;

    return {
        cssVars: {
            '--anim-duration': `${dur}ms`,
            '--anim-delay': `${del}ms`,
        },
        staticClasses: `pb-animate pb-anim-${animName}`,
    };
}
