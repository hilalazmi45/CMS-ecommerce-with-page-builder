/**
 * Money formatting utility.
 *
 * All monetary values in this application are stored as integer minor units
 * (e.g. 1000 = RM 10.00 or $10.00). This module provides a single
 * SSR-safe formatting function backed by the ECMA-402 Intl.NumberFormat API,
 * which is available in both browsers and Node.js (used during SSR).
 */

/**
 * Format an integer minor-unit amount (cents, sen, etc.) as a localised
 * currency string.
 *
 * @param minor    Amount in minor units (e.g. 1099 → $10.99).
 * @param currency ISO 4217 currency code (e.g. 'MYR', 'USD').
 * @param locale   BCP 47 locale tag; defaults to 'en-MY' for MYR, 'en-US' for
 *                 everything else when omitted.
 */
export function formatMoney(
    minor: number,
    currency: string,
    locale?: string,
): string {
    const resolvedLocale =
        locale ?? (currency === 'MYR' ? 'en-MY' : 'en-US');

    return new Intl.NumberFormat(resolvedLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(minor / 100);
}
