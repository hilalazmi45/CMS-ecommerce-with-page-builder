/**
 * Shared responsive-grid helper for page-builder widgets.
 *
 * Widgets store a fixed desktop column count, but a rigid `repeat(N, 1fr)` grid
 * overflows on narrow viewports (the track never shrinks below its content).
 * This returns a scoped class + CSS that uses `minmax(0, 1fr)` tracks (so wide
 * children can shrink) and collapses the column count on tablet / mobile.
 *
 * Usage:
 *   const { className, css } = responsiveGrid(component.id, cols, gap);
 *   return (<><style>{css}</style><div className={className}>…</div></>);
 */
export function responsiveGrid(
    id: string,
    columns: number,
    gap: string = '24px',
    opts: { tabletMax?: number; mobileMax?: number } = {},
): { className: string; css: string } {
    const cols = Math.max(1, columns || 1);
    const tablet = Math.min(cols, opts.tabletMax ?? 3);
    const mobile = Math.min(cols, opts.mobileMax ?? 2);
    const className = `pb-grid-${id}`;
    const css =
        `.${className}{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap};}` +
        `@media (max-width:1024px){.${className}{grid-template-columns:repeat(${tablet},minmax(0,1fr));}}` +
        `@media (max-width:640px){.${className}{grid-template-columns:repeat(${mobile},minmax(0,1fr));}}`;
    return { className, css };
}
