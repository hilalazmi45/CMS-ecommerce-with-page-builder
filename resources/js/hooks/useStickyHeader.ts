/**
 * useStickyHeader — attaches an IntersectionObserver to a sentinel element
 * placed at the top of the page. When the sentinel scrolls out of view the
 * header is considered "sticky" and receives the `is-sticky` CSS class.
 *
 * SSR-safe: IntersectionObserver is only created inside a useEffect (client-
 * only) and the function returns early when running on the server.
 *
 * Usage:
 *   const { headerRef, sentinelRef } = useStickyHeader();
 *   <div ref={sentinelRef} aria-hidden="true" />
 *   <header ref={headerRef} className="sticky top-0 z-50">…</header>
 *
 * The `is-sticky` class is added to the header element automatically. Style it
 * via global CSS or Tailwind's group-/peer- variants as needed.
 */

import { useEffect, useRef } from 'react';

export interface StickyHeaderRefs {
    headerRef: React.RefObject<HTMLElement | null>;
    sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useStickyHeader(): StickyHeaderRefs {
    const headerRef = useRef<HTMLElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Guard: IntersectionObserver is browser-only.
        if (typeof IntersectionObserver === 'undefined') return;

        const sentinel = sentinelRef.current;
        const header = headerRef.current;
        if (!sentinel || !header) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                if (entry.isIntersecting) {
                    header.classList.remove('is-sticky');
                } else {
                    header.classList.add('is-sticky');
                }
            },
            {
                // Fire as soon as the very top pixel of the sentinel disappears.
                threshold: 0,
                rootMargin: '0px',
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    return { headerRef, sentinelRef };
}
