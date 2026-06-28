import { describe, expect, it } from 'vitest';
import { formatMoney } from './money';

describe('formatMoney', () => {
    describe('MYR', () => {
        it('formats a typical MYR amount', () => {
            // 1099 minor units = RM 10.99
            const result = formatMoney(1099, 'MYR');
            expect(result).toContain('10.99');
            // Must include the currency symbol / code
            expect(result.toLowerCase()).toMatch(/rm|myr/i);
        });

        it('formats zero MYR correctly', () => {
            const result = formatMoney(0, 'MYR');
            expect(result).toContain('0.00');
        });

        it('formats a round MYR amount', () => {
            // 50000 minor units = RM 500.00
            const result = formatMoney(50000, 'MYR');
            expect(result).toContain('500.00');
        });
    });

    describe('USD', () => {
        it('formats a typical USD amount', () => {
            // 999 minor units = $9.99
            const result = formatMoney(999, 'USD');
            expect(result).toContain('9.99');
            expect(result).toMatch(/\$|\bUSD\b/);
        });

        it('formats zero USD correctly', () => {
            const result = formatMoney(0, 'USD');
            expect(result).toContain('0.00');
        });

        it('formats a large USD amount', () => {
            // 199999 minor units = $1,999.99
            const result = formatMoney(199999, 'USD');
            expect(result).toContain('1,999.99');
        });
    });

    describe('locale override', () => {
        it('accepts an explicit locale without throwing', () => {
            expect(() => formatMoney(100, 'USD', 'en-GB')).not.toThrow();
        });
    });

    describe('fractional rounding', () => {
        it('always shows exactly 2 decimal places', () => {
            // 100 minor units = 1.00 — must not omit trailing zero
            const result = formatMoney(100, 'USD');
            expect(result).toMatch(/1\.00/);
        });
    });
});
