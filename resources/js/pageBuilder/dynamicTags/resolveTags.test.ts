import { describe, expect, it } from 'vitest';
import './registry'; // seeds the shared tagMap with built-in tags
import { resolveTags, hasTags } from './resolveTags';
import type { DynamicTagContext } from './types';
import type { StorefrontProduct } from '@/pageBuilder/render/StorefrontContext';

function product(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
    return {
        id: 1,
        ulid: 'p1',
        name: 'Test Widget',
        slug: 'test-widget',
        type: 'simple',
        status: 'active',
        short_description: 'A short blurb.',
        regular_price: 1999,
        sale_price: null,
        is_featured: false,
        stock_status: 'in_stock',
        ...overrides,
    };
}

function ctx(overrides: Partial<DynamicTagContext> = {}): DynamicTagContext {
    return {
        storefront: { currentProduct: product(), products: [], categories: [], brands: [] },
        siteName: 'My Store',
        pageTitle: 'Home',
        ...overrides,
    };
}

describe('resolveTags', () => {
    it('returns the text unchanged when there are no tokens', () => {
        expect(resolveTags('Plain text', ctx())).toBe('Plain text');
    });

    it('resolves the product title', () => {
        expect(resolveTags('Buy {product.title} now', ctx())).toBe('Buy Test Widget now');
    });

    it('resolves the product price using regular price when no sale price', () => {
        // 1999 minor → RM 19.99 (currency formatting may vary, assert the digits)
        expect(resolveTags('{product.price}', ctx())).toContain('19.99');
    });

    it('prefers sale price over regular price', () => {
        const c = ctx({ storefront: { currentProduct: product({ sale_price: 1000 }), products: [], categories: [], brands: [] } });
        expect(resolveTags('{product.price}', c)).toContain('10.00');
    });

    it('resolves site name and page title', () => {
        expect(resolveTags('{site.name} — {page.title}', ctx())).toBe('My Store — Home');
    });

    it('resolves product tokens to empty string when no product is present', () => {
        const c = ctx({ storefront: { currentProduct: undefined, products: [], categories: [], brands: [] } });
        expect(resolveTags('Title: {product.title}!', c)).toBe('Title: !');
    });

    it('leaves unknown tokens intact', () => {
        expect(resolveTags('Hello {unknown.tag}', ctx())).toBe('Hello {unknown.tag}');
    });

    it('resolves the current year as four digits', () => {
        expect(resolveTags('{date.year}', ctx())).toMatch(/^\d{4}$/);
    });

    it('hasTags detects token presence', () => {
        expect(hasTags('a {product.title} b')).toBe(true);
        expect(hasTags('no tokens here')).toBe(false);
    });
});
