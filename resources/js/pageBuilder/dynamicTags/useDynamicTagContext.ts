/**
 * useDynamicTagContext — builds a DynamicTagContext from available runtime data.
 *
 * Combines:
 * - Storefront commerce data from useStorefront()
 * - Site name from the Vite env var (VITE_APP_NAME)
 * - Page title from Inertia shared props (optional — only present when a
 *   storefront controller explicitly shares it under `storefront.pageTitle`)
 *
 * SSR-safe: no browser APIs are accessed.
 */

import { usePage } from '@inertiajs/react';
import { useStorefront } from '@/pageBuilder/render/StorefrontContext';
import type { DynamicTagContext } from './types';
import type { PageProps } from '@/types';

interface StorefrontSharedExtended {
    pageTitle?: string;
}

export function useDynamicTagContext(): DynamicTagContext {
    const storefront = useStorefront();

    // Access shared Inertia props — cast safely via unknown.
    const page = usePage<PageProps>();
    const shared = (page.props as PageProps & { storefront?: StorefrontSharedExtended }).storefront;
    const pageTitle = shared?.pageTitle;

    const siteName =
        (import.meta.env['VITE_APP_NAME'] as string | undefined) ?? '';

    return { storefront, pageTitle, siteName };
}
