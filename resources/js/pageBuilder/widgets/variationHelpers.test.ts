import { describe, expect, it } from 'vitest';
import {
    deriveAttributes,
    findMatchingVariation,
    isColorAttribute,
    isValidCssColor,
    resolveVariationPrice,
} from './variationHelpers';
import type { StorefrontVariation } from '../render/StorefrontContext';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeVariation(overrides: Partial<StorefrontVariation> = {}): StorefrontVariation {
    return {
        id: 1,
        sku: 'TEST-SKU',
        regular_price: 1000,
        sale_price: null,
        stock_status: 'instock',
        manage_stock: false,
        stock_quantity: null,
        attribute_values: {},
        image_url: null,
        ...overrides,
    };
}

const RED_M = makeVariation({ id: 1, attribute_values: { Color: 'Red', Size: 'M' } });
const RED_L = makeVariation({ id: 2, attribute_values: { Color: 'Red', Size: 'L' } });
const BLUE_M = makeVariation({ id: 3, attribute_values: { Color: 'Blue', Size: 'M' } });

const VARIATIONS = [RED_M, RED_L, BLUE_M];

// ─── deriveAttributes ────────────────────────────────────────────────────────

describe('deriveAttributes', () => {
    it('returns an empty array for empty variations', () => {
        expect(deriveAttributes([])).toEqual([]);
    });

    it('derives distinct attribute names from variations', () => {
        const attrs = deriveAttributes(VARIATIONS);
        const names = attrs.map((a) => a.name).sort();
        expect(names).toEqual(['Color', 'Size']);
    });

    it('collects unique sorted values per attribute', () => {
        const attrs = deriveAttributes(VARIATIONS);
        const color = attrs.find((a) => a.name === 'Color')!;
        const size = attrs.find((a) => a.name === 'Size')!;
        expect(color.values).toEqual(['Blue', 'Red']);
        expect(size.values).toEqual(['L', 'M']);
    });

    it('handles a single variation with a single attribute', () => {
        const attrs = deriveAttributes([makeVariation({ attribute_values: { Size: 'XL' } })]);
        expect(attrs).toHaveLength(1);
        expect(attrs[0]!.name).toBe('Size');
        expect(attrs[0]!.values).toEqual(['XL']);
    });
});

// ─── findMatchingVariation ───────────────────────────────────────────────────

describe('findMatchingVariation', () => {
    it('returns null for empty selection', () => {
        expect(findMatchingVariation(VARIATIONS, {})).toBeNull();
    });

    it('returns null for partial selection (only one attribute chosen)', () => {
        expect(findMatchingVariation(VARIATIONS, { Color: 'Red' })).toBeNull();
    });

    it('returns the correct variation for a full match', () => {
        const result = findMatchingVariation(VARIATIONS, { Color: 'Red', Size: 'M' });
        expect(result).not.toBeNull();
        expect(result!.id).toBe(RED_M.id);
    });

    it('returns a different variation when a different combination is selected', () => {
        const result = findMatchingVariation(VARIATIONS, { Color: 'Blue', Size: 'M' });
        expect(result!.id).toBe(BLUE_M.id);
    });

    it('returns null when no variation matches the combination', () => {
        // Blue + L does not exist in VARIATIONS
        expect(findMatchingVariation(VARIATIONS, { Color: 'Blue', Size: 'L' })).toBeNull();
    });

    it('returns null for empty variation list', () => {
        expect(findMatchingVariation([], { Color: 'Red', Size: 'M' })).toBeNull();
    });
});

// ─── isColorAttribute ────────────────────────────────────────────────────────

describe('isColorAttribute', () => {
    it('matches "Color" (US spelling)', () => {
        expect(isColorAttribute('Color')).toBe(true);
    });

    it('matches "Colour" (UK spelling)', () => {
        expect(isColorAttribute('Colour')).toBe(true);
    });

    it('matches "color" (lowercase)', () => {
        expect(isColorAttribute('color')).toBe(true);
    });

    it('matches "COLOUR" (uppercase)', () => {
        expect(isColorAttribute('COLOUR')).toBe(true);
    });

    it('does not match "Size"', () => {
        expect(isColorAttribute('Size')).toBe(false);
    });

    it('does not match "Material"', () => {
        expect(isColorAttribute('Material')).toBe(false);
    });
});

// ─── isValidCssColor ─────────────────────────────────────────────────────────

describe('isValidCssColor', () => {
    it('accepts standard named colors', () => {
        expect(isValidCssColor('red')).toBe(true);
        expect(isValidCssColor('blue')).toBe(true);
        expect(isValidCssColor('white')).toBe(true);
        expect(isValidCssColor('black')).toBe(true);
    });

    it('accepts mixed-case named colors', () => {
        expect(isValidCssColor('Red')).toBe(true);
        expect(isValidCssColor('BLUE')).toBe(true);
    });

    it('accepts 3-digit hex', () => {
        expect(isValidCssColor('#fff')).toBe(true);
        expect(isValidCssColor('#a1b')).toBe(true);
    });

    it('accepts 6-digit hex', () => {
        expect(isValidCssColor('#ff0000')).toBe(true);
        expect(isValidCssColor('#1A2B3C')).toBe(true);
    });

    it('rejects arbitrary product attribute values like size labels', () => {
        expect(isValidCssColor('Small')).toBe(false);
        expect(isValidCssColor('XL')).toBe(false);
        expect(isValidCssColor('Cotton')).toBe(false);
    });

    it('rejects invalid hex strings', () => {
        expect(isValidCssColor('#gg0000')).toBe(false);
        expect(isValidCssColor('#12345')).toBe(false);   // 5 digits
        expect(isValidCssColor('#1234567')).toBe(false); // 7 digits
    });

    it('rejects empty string', () => {
        expect(isValidCssColor('')).toBe(false);
    });
});

// ─── resolveVariationPrice ───────────────────────────────────────────────────

describe('resolveVariationPrice', () => {
    it('returns sale_price when set', () => {
        const v = makeVariation({ regular_price: 2000, sale_price: 1500 });
        expect(resolveVariationPrice(v)).toBe(1500);
    });

    it('returns regular_price when sale_price is null', () => {
        const v = makeVariation({ regular_price: 2000, sale_price: null });
        expect(resolveVariationPrice(v)).toBe(2000);
    });

    it('returns 0 sale_price when explicitly set to 0', () => {
        // sale_price of 0 is technically valid (free item) — must not fall back
        const v = makeVariation({ regular_price: 5000, sale_price: 0 });
        // sale_price is 0, which is falsy — helper uses !== null check
        // 0 !== null → returns 0
        expect(resolveVariationPrice(v)).toBe(0);
    });
});
