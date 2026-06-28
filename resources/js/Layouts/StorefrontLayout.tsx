/**
 * StorefrontLayout — wraps every public storefront page.
 *
 * Reads the active header and footer PageSchema from Inertia shared props
 * (injected by HandleInertiaRequests middleware under the 'storefront' key)
 * and renders them around the page content via PageRenderer.
 *
 * If no header or footer template is active, those sections are simply omitted.
 *
 * Sticky header (C5):
 *   A zero-height sentinel element is placed before the <header>. An
 *   IntersectionObserver watches the sentinel; when it scrolls out of view
 *   the `is-sticky` CSS class is added to the <header> element, enabling
 *   styles defined in app.css. The observer is browser-only (SSR-safe).
 */

import { Head, usePage } from '@inertiajs/react';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import MiniCartDrawer from '@/Components/Storefront/MiniCartDrawer';
import { useStickyHeader } from '@/hooks/useStickyHeader';
import type { PageProps, StorefrontMeta } from '@/types';
import type { PageSchema } from '@/pageBuilder/types';

interface StorefrontSharedData {
    header: PageSchema | null;
    footer: PageSchema | null;
}

interface StorefrontLayoutProps {
    children: React.ReactNode;
}

/**
 * D8 — Render Open Graph + Twitter Card meta tags from the `meta` prop
 * injected by storefront controllers. Falls back gracefully when absent.
 *
 * Placed inside StorefrontLayout so every storefront page gets these tags
 * without requiring each page component to render them individually.
 */
function OgMeta({ meta }: { meta: StorefrontMeta | undefined }) {
    if (!meta) return null;

    return (
        <Head>
            {/* Open Graph */}
            <meta property="og:title" content={meta.title} />
            {meta.description && (
                <meta property="og:description" content={meta.description} />
            )}
            {meta.image && (
                <meta property="og:image" content={meta.image} />
            )}
            <meta property="og:url" content={meta.canonical} />
            <meta property="og:type" content="website" />

            {/* Twitter Card */}
            <meta name="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'} />
            <meta name="twitter:title" content={meta.title} />
            {meta.description && (
                <meta name="twitter:description" content={meta.description} />
            )}
            {meta.image && (
                <meta name="twitter:image" content={meta.image} />
            )}

            {/* Canonical URL */}
            <link rel="canonical" href={meta.canonical} />
        </Head>
    );
}

export default function StorefrontLayout({ children }: StorefrontLayoutProps) {
    // Cast to access the 'storefront' and 'meta' keys shared by HandleInertiaRequests.
    // We use 'unknown' cast to avoid fighting the generic index-signature constraint.
    const props = usePage<PageProps>().props as PageProps & {
        storefront?: StorefrontSharedData;
        meta?: StorefrontMeta;
    };
    const { storefront, meta } = props;
    const header = storefront?.header ?? null;
    const footer = storefront?.footer ?? null;

    const { headerRef, sentinelRef } = useStickyHeader();

    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* D8: OG/Twitter meta — injected per-page by storefront controllers */}
            <OgMeta meta={meta} />
            {header && (
                <>
                    {/*
                     * Sentinel: a zero-height element the IntersectionObserver
                     * watches. When it leaves the viewport the header becomes
                     * sticky. aria-hidden so screen readers skip it.
                     */}
                    <div
                        ref={sentinelRef}
                        aria-hidden="true"
                        style={{ height: 0, pointerEvents: 'none' }}
                    />

                    {/*
                     * The header element receives `is-sticky` via the hook
                     * when the sentinel scrolls out of view. CSS in app.css
                     * handles the visual sticky treatment.
                     *
                     * `position: sticky` + `top: 0` ensure the browser
                     * keeps the header pinned once it reaches the top of
                     * the viewport without JavaScript layout shifts.
                     */}
                    <header
                        ref={headerRef}
                        className="storefront-header sticky top-0 z-50 w-full transition-shadow duration-200"
                    >
                        <PageRenderer schema={header} />
                    </header>
                </>
            )}

            <main className="flex-1">{children}</main>

            {footer && (
                <footer>
                    <PageRenderer schema={footer} />
                </footer>
            )}

            {/* Mini-cart drawer — mounted once, opened via openMiniCart() event */}
            <MiniCartDrawer />
        </div>
    );
}
