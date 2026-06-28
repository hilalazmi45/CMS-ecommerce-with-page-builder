import type { ComponentStyle, ResponsiveStyles } from '../types';

/**
 * Converts a camelCase CSS property name to kebab-case.
 * e.g. "borderRadius" → "border-radius", "boxShadow" → "box-shadow"
 */
function toKebab(key: string): string {
    return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * Converts a ComponentStyle object into CSS rule declarations (indented, no selector).
 * All camelCase keys are converted to kebab-case. Undefined/empty values are skipped.
 */
function styleObjectToDeclarations(style: ComponentStyle): string {
    return Object.entries(style)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `  ${toKebab(k)}: ${v};`)
        .join('\n');
}

/**
 * Takes a component id and its ResponsiveStyles and returns:
 * - className: a scoped class name like "pb-<id>" to apply to the element
 * - css: the full CSS string (desktop base rules + @media blocks for tablet/mobile)
 *
 * Desktop styles become base rules on the scoped class.
 * Tablet styles are wrapped in @media (max-width: 1024px).
 * Mobile styles are wrapped in @media (max-width: 768px).
 * camelCase ComponentStyle keys are converted to kebab-case.
 * Undefined/empty values are skipped.
 *
 * Optional customCss is injected scoped to #el-{id} for user-authored custom styles.
 */
export function renderStyles(
    id: string,
    styles: ResponsiveStyles,
    customCss?: string,
): { className: string; css: string } {
    const className = `pb-${id}`;
    const parts: string[] = [];

    if (styles.desktop) {
        const decls = styleObjectToDeclarations(styles.desktop);
        if (decls) {
            parts.push(`.${className} {\n${decls}\n}`);
        }
    }

    if (styles.tablet) {
        const decls = styleObjectToDeclarations(styles.tablet);
        if (decls) {
            parts.push(`@media (max-width: 1024px) {\n  .${className} {\n${decls.replace(/^/gm, '  ')}\n  }\n}`);
        }
    }

    if (styles.mobile) {
        const decls = styleObjectToDeclarations(styles.mobile);
        if (decls) {
            parts.push(`@media (max-width: 768px) {\n  .${className} {\n${decls.replace(/^/gm, '  ')}\n  }\n}`);
        }
    }

    // Inject custom CSS scoped to #el-{id} (authored in the Advanced tab).
    // Each rule's selector is prefixed so styles only affect this element's subtree.
    if (customCss && customCss.trim()) {
        const scoped = customCss.trim().replace(
            /([^{}]+)\{/g,
            (_, selector: string) => `#el-${id} ${selector.trim()} {`,
        );
        parts.push(`/* custom: ${id} */\n${scoped}`);
    }

    return { className, css: parts.join('\n') };
}

// ─── Pure style-building helpers (also used by StyleControls.tsx) ────────────

/**
 * Compose four spacing sides into individual longhand ComponentStyle keys.
 * When linked=true, all sides take the value of `top`.
 */
export function composeSpacing(
    prefix: 'padding' | 'margin',
    sides: { top: string; right: string; bottom: string; left: string },
    linked: boolean,
): Partial<ComponentStyle> {
    if (linked) {
        const v = sides.top !== '' ? sides.top : '';
        return {
            [`${prefix}Top`]: v,
            [`${prefix}Right`]: v,
            [`${prefix}Bottom`]: v,
            [`${prefix}Left`]: v,
        };
    }
    const result: Partial<ComponentStyle> = {};
    if (sides.top !== '') result[`${prefix}Top`] = sides.top;
    if (sides.right !== '') result[`${prefix}Right`] = sides.right;
    if (sides.bottom !== '') result[`${prefix}Bottom`] = sides.bottom;
    if (sides.left !== '') result[`${prefix}Left`] = sides.left;
    return result;
}

/**
 * Build a CSS linear-gradient() string from two color stops and an angle.
 */
export function buildLinearGradient(angle: number, color1: string, color2: string): string {
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

/**
 * Build a CSS filter string from individual filter function values.
 * Values at their neutral default are omitted (blur=0, brightness=100, etc.).
 */
export function buildFilter(filters: {
    blur: number;
    brightness: number;
    contrast: number;
    saturate: number;
    hueRotate: number;
}): string {
    const parts: string[] = [];
    if (filters.blur !== 0) parts.push(`blur(${filters.blur}px)`);
    if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
    if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
    if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
    return parts.join(' ');
}

/**
 * Build a CSS transform string from individual transform function values.
 * Values at their neutral default are omitted (rotate=0, scale=1, etc.).
 */
export function buildTransform(t: {
    rotate: number;
    scale: number;
    translateX: number;
    translateY: number;
    skewX: number;
    skewY: number;
}): string {
    const parts: string[] = [];
    if (t.rotate !== 0) parts.push(`rotate(${t.rotate}deg)`);
    if (t.scale !== 1) parts.push(`scale(${t.scale})`);
    if (t.translateX !== 0) parts.push(`translateX(${t.translateX}px)`);
    if (t.translateY !== 0) parts.push(`translateY(${t.translateY}px)`);
    if (t.skewX !== 0) parts.push(`skewX(${t.skewX}deg)`);
    if (t.skewY !== 0) parts.push(`skewY(${t.skewY}deg)`);
    return parts.join(' ');
}
