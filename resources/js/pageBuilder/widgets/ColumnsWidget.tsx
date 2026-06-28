/**
 * ColumnsWidget — responsive CSS grid container.
 *
 * A2 additions:
 * - Elementor-style preset buttons (1 / 1-1 / 1-1-1 / 1-2 / 2-1 / 1-1-1-1)
 * - Gap control (preserved)
 * - Custom template override (preserved)
 * - Per-column settings are handled through the child widgets' own style panel.
 */
import type { CSSProperties } from 'react';
import { registerWidget } from '../registry';
import type { PageComponent, WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

// ─── Preset grid templates ────────────────────────────────────────────────────

interface ColumnPreset {
    /** Human-readable label shown on the button */
    label: string;
    /** Exact CSS grid-template-columns value (desktop) */
    template: string;
    /** Number of resulting columns (used for responsive tablet collapse) */
    count: number;
}

const COLUMN_PRESETS: ColumnPreset[] = [
    { label: '1', template: 'minmax(0, 1fr)', count: 1 },
    { label: '1/2 1/2', template: 'repeat(2, minmax(0, 1fr))', count: 2 },
    { label: '1/3 ×3', template: 'repeat(3, minmax(0, 1fr))', count: 3 },
    { label: '1/3 2/3', template: 'minmax(0, 1fr) minmax(0, 2fr)', count: 2 },
    { label: '2/3 1/3', template: 'minmax(0, 2fr) minmax(0, 1fr)', count: 2 },
    { label: '1/4 ×4', template: 'repeat(4, minmax(0, 1fr))', count: 4 },
];

// ─── Shared grid style (editor canvas + storefront preview) ──────────────────

function columnsContainerStyle(component: PageComponent, device: 'desktop' | 'tablet' | 'mobile' = 'desktop'): CSSProperties {
    const { template = 'repeat(2, minmax(0, 1fr))', gap = '24px' } = component.settings as Record<string, string>;
    const customTemplate = (component.settings.customTemplate as string | undefined)?.trim();

    let gridTemplateColumns: string;
    if (device === 'mobile') {
        gridTemplateColumns = 'minmax(0, 1fr)';
    } else if (device === 'tablet') {
        // Collapse to at most 2 columns on tablet
        gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    } else {
        gridTemplateColumns = customTemplate || template;
    }

    return { display: 'grid', gridTemplateColumns, gap, alignItems: 'start' };
}

// ─── Preview — scoped responsive CSS ─────────────────────────────────────────

function Preview({ component, children }: WidgetPreviewProps) {
    const { template = 'repeat(2, minmax(0, 1fr))', gap = '24px' } = component.settings as Record<string, string>;
    const customTemplate = (component.settings.customTemplate as string | undefined)?.trim();

    const desktopCols = customTemplate || template;
    // Approximate tablet: max 2 cols if desktop has more
    const tabletCols = 'repeat(2, minmax(0, 1fr))';

    const cls = `pb-cols-${component.id}`;
    const css =
        `.${cls}{display:grid;grid-template-columns:${desktopCols};gap:${gap};align-items:start;}` +
        `@media (max-width:1024px){.${cls}{grid-template-columns:${tabletCols};}}` +
        `@media (max-width:640px){.${cls}{grid-template-columns:minmax(0,1fr);}}`;

    return (
        <>
            <style>{css}</style>
            <div className={cls}>{children}</div>
        </>
    );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function Editor({ component, isSelected, onSelect, children }: WidgetEditorProps) {
    const { template = 'repeat(2, minmax(0, 1fr))' } = component.settings as Record<string, string>;
    const customTemplate = (component.settings.customTemplate as string | undefined)?.trim();

    // Find a matching preset label for the badge
    const preset = COLUMN_PRESETS.find((p) => p.template === template);
    const badgeLabel = customTemplate ? 'Custom' : (preset?.label ?? template);

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`relative min-h-[60px] rounded ${isSelected ? 'ring-2 ring-green-400' : 'hover:ring-1 hover:ring-green-200'}`}
        >
            {isSelected && (
                <div className="absolute right-2 top-1 z-10 rounded bg-green-500 px-2 py-0.5 text-xs text-white">
                    {badgeLabel}
                </div>
            )}
            {children}
        </div>
    );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string | undefined>;
    const currentTemplate = s.template ?? 'repeat(2, minmax(0, 1fr))';
    const customTemplate = s.customTemplate ?? '';

    const set = (key: string, value: string) => onChange({ ...s, [key]: value });

    return (
        <div className="space-y-4 p-3">
            {/* Preset buttons */}
            <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Column Layout
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                    {COLUMN_PRESETS.map((preset) => {
                        const active = currentTemplate === preset.template && !customTemplate;
                        return (
                            <button
                                key={preset.template}
                                type="button"
                                title={preset.label}
                                onClick={() => {
                                    // Selecting a preset clears custom template
                                    onChange({ ...s, template: preset.template, customTemplate: '' });
                                }}
                                className={`rounded border px-2 py-2 text-[10px] font-medium leading-tight transition-colors ${
                                    active
                                        ? 'border-[#c2185b] bg-[#c2185b]/10 text-[#c2185b]'
                                        : 'border-gray-200 text-gray-500 hover:border-[#c2185b]/50'
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Gap */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Gap
                </label>
                <input
                    type="text"
                    value={s.gap ?? '24px'}
                    onChange={(e) => set('gap', e.target.value)}
                    placeholder="24px"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>

            {/* Custom template */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Custom Template
                </label>
                <input
                    type="text"
                    value={customTemplate}
                    onChange={(e) => set('customTemplate', e.target.value)}
                    placeholder="auto minmax(0,1fr) auto"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                    Overrides the preset on desktop. e.g. <code>auto minmax(0,1fr) auto</code>. Clear to use the preset.
                </p>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'columns',
    version: 2,
    category: 'layout',
    label: 'Columns',
    icon: '⊞',
    hasChildren: true,
    defaultSettings: {
        template: 'repeat(2, minmax(0, 1fr))',
        gap: '24px',
        customTemplate: '',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
    getChildrenContainerStyle: columnsContainerStyle,
};

registerWidget(def);
export default def;
