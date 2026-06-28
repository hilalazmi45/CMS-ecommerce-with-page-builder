/**
 * Unit tests for renderStyles helpers (A3).
 *
 * Tests:
 * - renderStyles: camelCase→kebab, desktop/tablet/mobile @media blocks, customCss injection
 * - composeSpacing: linked / unlinked sides
 * - buildLinearGradient
 * - buildFilter: neutral values omitted
 * - buildTransform: neutral values omitted
 */

import { describe, it, expect } from 'vitest';
import {
    renderStyles,
    composeSpacing,
    buildLinearGradient,
    buildFilter,
    buildTransform,
} from './renderStyles';

// ─── renderStyles ─────────────────────────────────────────────────────────────

describe('renderStyles', () => {
    it('returns a scoped class name prefixed with pb-', () => {
        const { className } = renderStyles('abc123', {});
        expect(className).toBe('pb-abc123');
    });

    it('emits desktop base rules', () => {
        const { css } = renderStyles('x', { desktop: { color: 'red', fontSize: '16px' } });
        expect(css).toContain('.pb-x {');
        expect(css).toContain('color: red;');
        expect(css).toContain('font-size: 16px;');
    });

    it('converts camelCase keys to kebab-case', () => {
        const { css } = renderStyles('x', { desktop: { borderRadius: '8px', boxShadow: '0 2px 4px #000' } });
        expect(css).toContain('border-radius: 8px;');
        expect(css).toContain('box-shadow: 0 2px 4px #000;');
    });

    it('wraps tablet in @media (max-width: 1024px)', () => {
        const { css } = renderStyles('x', { tablet: { paddingTop: '10px' } });
        expect(css).toContain('@media (max-width: 1024px)');
        expect(css).toContain('padding-top: 10px;');
    });

    it('wraps mobile in @media (max-width: 768px)', () => {
        const { css } = renderStyles('x', { mobile: { marginBottom: '5px' } });
        expect(css).toContain('@media (max-width: 768px)');
        expect(css).toContain('margin-bottom: 5px;');
    });

    it('skips undefined and empty-string values', () => {
        const { css } = renderStyles('x', { desktop: { color: '', opacity: undefined, fontSize: '14px' } });
        expect(css).not.toContain('color:');
        expect(css).not.toContain('opacity:');
        expect(css).toContain('font-size: 14px;');
    });

    it('returns empty css when styles is empty', () => {
        const { css } = renderStyles('x', {});
        expect(css).toBe('');
    });

    it('injects customCss scoped to #el-{id}', () => {
        const { css } = renderStyles('x', {}, '.inner { color: blue; }');
        expect(css).toContain('#el-x .inner {');
        expect(css).toContain('color: blue;');
    });

    it('does not inject customCss when empty', () => {
        const { css } = renderStyles('x', {}, '');
        expect(css).not.toContain('#el-');
    });

    it('handles multi-breakpoint with customCss together', () => {
        const { css } = renderStyles(
            'c1',
            { desktop: { color: 'red' }, mobile: { color: 'blue' } },
            '.sub { display: none; }',
        );
        expect(css).toContain('.pb-c1 {');
        expect(css).toContain('@media (max-width: 768px)');
        expect(css).toContain('#el-c1 .sub {');
    });
});

// ─── composeSpacing ───────────────────────────────────────────────────────────

describe('composeSpacing', () => {
    it('linked: all sides take the top value', () => {
        const result = composeSpacing('padding', { top: '20px', right: '10px', bottom: '5px', left: '0px' }, true);
        expect(result).toEqual({
            paddingTop: '20px',
            paddingRight: '20px',
            paddingBottom: '20px',
            paddingLeft: '20px',
        });
    });

    it('linked: empty top produces empty for all sides', () => {
        const result = composeSpacing('margin', { top: '', right: '', bottom: '', left: '' }, true);
        expect(result).toEqual({
            marginTop: '',
            marginRight: '',
            marginBottom: '',
            marginLeft: '',
        });
    });

    it('unlinked: each side is set independently', () => {
        const result = composeSpacing('padding', { top: '10px', right: '20px', bottom: '30px', left: '40px' }, false);
        expect(result).toEqual({
            paddingTop: '10px',
            paddingRight: '20px',
            paddingBottom: '30px',
            paddingLeft: '40px',
        });
    });

    it('unlinked: empty strings produce no key', () => {
        const result = composeSpacing('margin', { top: '10px', right: '', bottom: '', left: '' }, false);
        expect(result).toEqual({ marginTop: '10px' });
    });

    it('works for margin prefix', () => {
        const result = composeSpacing('margin', { top: '5px', right: '5px', bottom: '5px', left: '5px' }, true);
        expect(result.marginTop).toBe('5px');
        expect(result.marginLeft).toBe('5px');
    });
});

// ─── buildLinearGradient ──────────────────────────────────────────────────────

describe('buildLinearGradient', () => {
    it('produces correct linear-gradient CSS', () => {
        expect(buildLinearGradient(135, '#fff', '#000')).toBe('linear-gradient(135deg, #fff, #000)');
    });

    it('handles angle 0', () => {
        expect(buildLinearGradient(0, 'red', 'blue')).toBe('linear-gradient(0deg, red, blue)');
    });

    it('handles 360', () => {
        expect(buildLinearGradient(360, '#f00', '#0f0')).toBe('linear-gradient(360deg, #f00, #0f0)');
    });
});

// ─── buildFilter ─────────────────────────────────────────────────────────────

describe('buildFilter', () => {
    it('returns empty string when all values are neutral', () => {
        expect(buildFilter({ blur: 0, brightness: 100, contrast: 100, saturate: 100, hueRotate: 0 })).toBe('');
    });

    it('includes blur when non-zero', () => {
        const result = buildFilter({ blur: 5, brightness: 100, contrast: 100, saturate: 100, hueRotate: 0 });
        expect(result).toContain('blur(5px)');
    });

    it('includes brightness when not 100', () => {
        const result = buildFilter({ blur: 0, brightness: 150, contrast: 100, saturate: 100, hueRotate: 0 });
        expect(result).toContain('brightness(150%)');
    });

    it('includes multiple filters', () => {
        const result = buildFilter({ blur: 2, brightness: 80, contrast: 110, saturate: 90, hueRotate: 45 });
        expect(result).toContain('blur(2px)');
        expect(result).toContain('brightness(80%)');
        expect(result).toContain('contrast(110%)');
        expect(result).toContain('saturate(90%)');
        expect(result).toContain('hue-rotate(45deg)');
    });

    it('omits neutral values even when others are non-neutral', () => {
        const result = buildFilter({ blur: 3, brightness: 100, contrast: 100, saturate: 100, hueRotate: 0 });
        expect(result).not.toContain('brightness');
        expect(result).not.toContain('contrast');
        expect(result).not.toContain('hue-rotate');
    });
});

// ─── buildTransform ───────────────────────────────────────────────────────────

describe('buildTransform', () => {
    it('returns empty string when all values are neutral', () => {
        expect(buildTransform({ rotate: 0, scale: 1, translateX: 0, translateY: 0, skewX: 0, skewY: 0 })).toBe('');
    });

    it('includes rotate when non-zero', () => {
        const result = buildTransform({ rotate: 45, scale: 1, translateX: 0, translateY: 0, skewX: 0, skewY: 0 });
        expect(result).toContain('rotate(45deg)');
    });

    it('includes scale when not 1', () => {
        const result = buildTransform({ rotate: 0, scale: 1.5, translateX: 0, translateY: 0, skewX: 0, skewY: 0 });
        expect(result).toContain('scale(1.5)');
    });

    it('includes translate values when non-zero', () => {
        const result = buildTransform({ rotate: 0, scale: 1, translateX: 10, translateY: -20, skewX: 0, skewY: 0 });
        expect(result).toContain('translateX(10px)');
        expect(result).toContain('translateY(-20px)');
    });

    it('includes skew values when non-zero', () => {
        const result = buildTransform({ rotate: 0, scale: 1, translateX: 0, translateY: 0, skewX: 5, skewY: -3 });
        expect(result).toContain('skewX(5deg)');
        expect(result).toContain('skewY(-3deg)');
    });

    it('combines multiple transforms in order', () => {
        const result = buildTransform({ rotate: 10, scale: 0.8, translateX: 5, translateY: 0, skewX: 0, skewY: 0 });
        const parts = result.split(' ');
        expect(parts[0]).toContain('rotate');
        expect(parts[1]).toContain('scale');
        expect(parts[2]).toContain('translateX');
    });

    it('omits neutral values even when others present', () => {
        const result = buildTransform({ rotate: 30, scale: 1, translateX: 0, translateY: 0, skewX: 0, skewY: 0 });
        expect(result).not.toContain('scale');
        expect(result).not.toContain('translate');
    });
});
