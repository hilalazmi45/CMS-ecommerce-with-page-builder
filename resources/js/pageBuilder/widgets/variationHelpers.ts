/**
 * Pure helpers for product variation selector logic.
 *
 * These functions are intentionally framework-free and free of side effects so
 * they are straightforward to unit-test and safe to call during SSR.
 */

import type { StorefrontVariation } from '../render/StorefrontContext';

// ─── Attribute derivation ────────────────────────────────────────────────────

export interface DerivedAttribute {
    name: string;
    values: string[];
}

/**
 * Derive distinct attribute names and their sorted unique values from a list of
 * variations.
 *
 * Example:
 *   variations with attribute_values [{ Color: 'Red', Size: 'M' }, { Color: 'Blue', Size: 'L' }]
 *   → [{ name: 'Color', values: ['Blue', 'Red'] }, { name: 'Size', values: ['L', 'M'] }]
 */
export function deriveAttributes(variations: StorefrontVariation[]): DerivedAttribute[] {
    const map = new Map<string, Set<string>>();

    for (const variation of variations) {
        for (const [attr, value] of Object.entries(variation.attribute_values)) {
            if (!map.has(attr)) {
                map.set(attr, new Set());
            }
            map.get(attr)!.add(value);
        }
    }

    return Array.from(map.entries()).map(([name, valSet]) => ({
        name,
        values: Array.from(valSet).sort(),
    }));
}

// ─── Variation matching ──────────────────────────────────────────────────────

/**
 * Find the variation whose attribute_values exactly match every key-value pair
 * in `selected`.
 *
 * Returns `null` when:
 * - `selected` is empty
 * - `selected` does not cover all attributes present in the variations
 * - no variation matches the full combination
 */
export function findMatchingVariation(
    variations: StorefrontVariation[],
    selected: Record<string, string>,
): StorefrontVariation | null {
    if (Object.keys(selected).length === 0) return null;

    const attributes = deriveAttributes(variations);
    if (attributes.length === 0) return null;

    // All attributes must have a selection before we try to match.
    const allSelected = attributes.every((attr) => attr.name in selected && selected[attr.name] !== '');
    if (!allSelected) return null;

    return (
        variations.find((v) =>
            attributes.every((attr) => v.attribute_values[attr.name] === selected[attr.name]),
        ) ?? null
    );
}

// ─── Color heuristics ────────────────────────────────────────────────────────

/**
 * Heuristic: an attribute is a colour attribute when its name matches /colou?r/i.
 */
export function isColorAttribute(name: string): boolean {
    return /colou?r/i.test(name);
}

/**
 * Returns `true` when `value` is a valid CSS color that the browser can render
 * directly as a background-color (hex shorthand, full hex, or any named color
 * from the CSS Color Level 4 keyword list that we bother to enumerate).
 *
 * We keep the whitelist reasonable — exotic SVG named colors are omitted.
 */
const CSS_NAMED_COLORS = new Set([
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure',
    'beige', 'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet',
    'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate',
    'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan',
    'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen',
    'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange',
    'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
    'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet',
    'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
    'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
    'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
    'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory',
    'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
    'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
    'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
    'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
    'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
    'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
    'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
    'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
    'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
    'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
    'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
    'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple',
    'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown',
    'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver',
    'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
    'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato',
    'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow',
    'yellowgreen',
]);

export function isValidCssColor(value: string): boolean {
    const v = value.trim().toLowerCase();
    if (CSS_NAMED_COLORS.has(v)) return true;
    // #rgb or #rrggbb
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

// ─── Price resolution ────────────────────────────────────────────────────────

/**
 * Return the effective price (sale_price when available, otherwise regular_price)
 * in integer minor units.
 */
export function resolveVariationPrice(variation: StorefrontVariation): number {
    return variation.sale_price !== null && variation.sale_price !== undefined
        ? variation.sale_price
        : variation.regular_price;
}
