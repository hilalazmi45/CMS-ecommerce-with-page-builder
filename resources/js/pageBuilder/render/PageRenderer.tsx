/**
 * PageRenderer — public storefront renderer for page builder schemas.
 *
 * Takes a PageSchema and renders each component using the widget registry's
 * PreviewComponent, exactly mirroring how the admin editor applies styles and
 * settings. Handles:
 * - Scoped CSS from ResponsiveStyles (desktop base + @media tablet/mobile)
 * - _cssId / _cssClass from component.settings (same convention as Editor.tsx)
 * - Recursive children for widgets with hasChildren=true
 * - Graceful fallback for unknown widget types (renders a placeholder div, no throw)
 * - A5: entrance animations via IntersectionObserver (SSR-safe, reduced-motion-aware)
 *
 * Importing this module also imports registerAll to ensure the widget registry
 * is populated on the public storefront bundle.
 */

import '@/pageBuilder/registerAll';
import { useEffect, useMemo, useRef } from 'react';
import { getWidget } from '@/pageBuilder/registry';
import { runMigrations } from '@/pageBuilder/migrations/runMigrations';
import { renderStyles } from './renderStyles';
import { buildAnimationProps } from '@/pageBuilder/animations';
import type { PageComponent, PageSchema } from '@/pageBuilder/types';

// ─── A5: animation observer hook ────────────────────────────────────────────

/**
 * SSR-safe IntersectionObserver hook.
 * Adds the trigger class `pb-anim-run` to the element when it enters the
 * viewport. Only runs in the browser (useEffect + typeof window guard).
 */
function useAnimationObserver(
    ref: React.RefObject<HTMLDivElement | null>,
    hasAnimation: boolean,
): void {
    useEffect(() => {
        // SSR guard — IntersectionObserver does not exist on the server
        if (typeof window === 'undefined') return;
        if (!hasAnimation) return;
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('pb-anim-run');
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, hasAnimation]);
}

// ─── Single component renderer ──────────────────────────────────────────────

interface RenderComponentProps {
    component: PageComponent;
}

function RenderComponent({ component }: RenderComponentProps) {
    // A5: hooks MUST be called before any early return (Rules of Hooks).
    // Resolve animation props first so we can pass `animProps !== null` to the observer.
    const animProps = buildAnimationProps(
        component.settings._animation,
        component.settings._animDuration,
        component.settings._animDelay,
    );

    // Ref used by the IntersectionObserver (created unconditionally — Rules of Hooks).
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    useAnimationObserver(wrapperRef, animProps !== null);

    // A6: components hidden by the navigator are never rendered on the storefront.
    if (component.settings._hidden === true) return null;

    const def = getWidget(component.type);
    const customCss = (component.settings._customCss as string) || undefined;
    const { className: scopedClass, css } = renderStyles(
        component.id,
        component.styles ?? {},
        customCss,
    );

    // Replicate Editor.tsx convention (lines 111-118):
    const cssId = (component.settings._cssId as string) || undefined;
    const cssClass = (component.settings._cssClass as string) || '';

    const combinedClass = [scopedClass, cssClass, animProps?.staticClasses ?? '']
        .filter(Boolean)
        .join(' ');

    // Inline CSS vars for animation duration/delay
    const animStyle = animProps
        ? (animProps.cssVars as React.CSSProperties)
        : undefined;

    // Unknown widget type — render a non-breaking empty placeholder
    if (!def) {
        return (
            <>
                {css && <style>{css}</style>}
                <div
                    ref={wrapperRef}
                    id={cssId}
                    className={combinedClass}
                    style={animStyle}
                    data-widget-type={component.type}
                    aria-hidden="true"
                />
            </>
        );
    }

    const Preview = def.PreviewComponent;

    // Recurse into children only for widgets that declare hasChildren
    const childNodes =
        def.hasChildren && component.children && component.children.length > 0
            ? component.children.map((child) => (
                  <RenderComponent key={child.id} component={child} />
              ))
            : undefined;

    return (
        <>
            {css && <style>{css}</style>}
            <div ref={wrapperRef} id={cssId} className={combinedClass} style={animStyle}>
                <Preview component={component}>{childNodes}</Preview>
            </div>
        </>
    );
}

// ─── Top-level renderer ─────────────────────────────────────────────────────

interface PageRendererProps {
    schema: PageSchema;
}

export default function PageRenderer({ schema }: PageRendererProps) {
    // Normalise older persisted widgets to their current version before render.
    const migrated = useMemo(() => runMigrations(schema), [schema]);

    if (!migrated?.components?.length) {
        return null;
    }

    return (
        <>
            {migrated.components.map((component) => (
                <RenderComponent key={component.id} component={component} />
            ))}
        </>
    );
}
