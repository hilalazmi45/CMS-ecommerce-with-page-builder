/**
 * Unit tests for animations.ts pure helpers (A5).
 */

import { describe, it, expect } from 'vitest';
import {
    ANIMATION_NAMES,
    ANIMATION_LABELS,
    isValidAnimation,
    buildAnimationProps,
    DEFAULT_ANIMATION_DURATION_MS,
    DEFAULT_ANIMATION_DELAY_MS,
} from './animations';

describe('ANIMATION_NAMES', () => {
    it('includes none', () => {
        expect(ANIMATION_NAMES).toContain('none');
    });

    it('includes all core fading animations', () => {
        expect(ANIMATION_NAMES).toContain('fadeIn');
        expect(ANIMATION_NAMES).toContain('fadeInUp');
        expect(ANIMATION_NAMES).toContain('fadeInDown');
        expect(ANIMATION_NAMES).toContain('fadeInLeft');
        expect(ANIMATION_NAMES).toContain('fadeInRight');
    });

    it('includes zoom and slide animations', () => {
        expect(ANIMATION_NAMES).toContain('zoomIn');
        expect(ANIMATION_NAMES).toContain('slideInUp');
        expect(ANIMATION_NAMES).toContain('slideInRight');
    });

    it('has a label for every animation name', () => {
        for (const name of ANIMATION_NAMES) {
            expect(ANIMATION_LABELS[name]).toBeTruthy();
        }
    });
});

describe('isValidAnimation', () => {
    it('returns false for "none"', () => {
        expect(isValidAnimation('none')).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isValidAnimation(undefined)).toBe(false);
    });

    it('returns false for an unknown string', () => {
        expect(isValidAnimation('spinAround')).toBe(false);
    });

    it('returns true for a real animation name', () => {
        expect(isValidAnimation('fadeInUp')).toBe(true);
        expect(isValidAnimation('bounce')).toBe(true);
        expect(isValidAnimation('zoomIn')).toBe(true);
    });
});

describe('buildAnimationProps', () => {
    it('returns null when animation is none', () => {
        expect(buildAnimationProps('none', 600, 0)).toBeNull();
    });

    it('returns null when animation is undefined', () => {
        expect(buildAnimationProps(undefined, 600, 0)).toBeNull();
    });

    it('returns null for an unknown animation name', () => {
        expect(buildAnimationProps('spinAround', 600, 0)).toBeNull();
    });

    it('returns correct cssVars and staticClasses for a valid animation', () => {
        const result = buildAnimationProps('fadeInUp', 800, 200);
        expect(result).not.toBeNull();
        expect(result!.cssVars['--anim-duration']).toBe('800ms');
        expect(result!.cssVars['--anim-delay']).toBe('200ms');
        expect(result!.staticClasses).toContain('pb-animate');
        expect(result!.staticClasses).toContain('pb-anim-fadeInUp');
    });

    it('applies defaults when duration/delay are not numbers', () => {
        const result = buildAnimationProps('bounce', undefined, null);
        expect(result).not.toBeNull();
        expect(result!.cssVars['--anim-duration']).toBe(`${DEFAULT_ANIMATION_DURATION_MS}ms`);
        expect(result!.cssVars['--anim-delay']).toBe(`${DEFAULT_ANIMATION_DELAY_MS}ms`);
    });

    it('applies default duration when given zero duration', () => {
        const result = buildAnimationProps('pulse', 0, 50);
        expect(result).not.toBeNull();
        expect(result!.cssVars['--anim-duration']).toBe(`${DEFAULT_ANIMATION_DURATION_MS}ms`);
    });

    it('returns a static class matching the animation key', () => {
        const result = buildAnimationProps('jackInTheBox', 500, 0);
        expect(result!.staticClasses).toBe('pb-animate pb-anim-jackInTheBox');
    });
});
