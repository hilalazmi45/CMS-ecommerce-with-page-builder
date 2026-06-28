/**
 * SectionWidget — full-width page section with Elementor-style layout presets.
 *
 * A2 additions:
 * - Column layout presets (1 / 1-1 / 1-1-1 / 1-2 / 2-1 / 1-1-1-1)
 * - Background overlay (color + opacity)
 * - Min height (numeric + unit)
 * - Vertical alignment for children
 * - HTML tag selector (section / div / article / header / footer)
 *   stored as settings._tag and rendered by Preview
 * - Sticky toggle (stored as settings._sticky — rendered by theme wrapper / C5)
 */
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

// ─── Preset definitions ───────────────────────────────────────────────────────

interface LayoutPreset {
    label: string;
    /** CSS grid-template-columns value for the children grid */
    template: string;
    /** Approximate visual description for the preset button */
    icon: string;
}

const LAYOUT_PRESETS: LayoutPreset[] = [
    { label: '1', template: '1fr', icon: '▭' },
    { label: '1/2 1/2', template: '1fr 1fr', icon: '⊟' },
    { label: '1/3 1/3 1/3', template: '1fr 1fr 1fr', icon: '⊞' },
    { label: '1/3 2/3', template: '1fr 2fr', icon: '⊠' },
    { label: '2/3 1/3', template: '2fr 1fr', icon: '⊡' },
    { label: '1/4 ×4', template: '1fr 1fr 1fr 1fr', icon: '⊟' },
];

const HTML_TAGS = ['section', 'div', 'article', 'header', 'footer'] as const;
type HtmlTag = typeof HTML_TAGS[number];

const VALIGN_OPTIONS = ['flex-start', 'center', 'flex-end', 'space-between', 'stretch'] as const;
type VAlign = typeof VALIGN_OPTIONS[number];
const VALIGN_LABELS: Record<VAlign, string> = {
    'flex-start': 'Top',
    'center': 'Middle',
    'flex-end': 'Bottom',
    'space-between': 'Space Between',
    'stretch': 'Stretch',
};

// ─── Preview ──────────────────────────────────────────────────────────────────

function Preview({ component, children }: WidgetPreviewProps) {
    const s = component.settings as Record<string, string | undefined>;
    const tag = (s._tag ?? 'section') as HtmlTag;
    const overlay = s.overlayColor;
    const overlayOpacity = parseFloat(s.overlayOpacity ?? '0.5');
    const minHeight = s.minHeight ?? '';
    const vAlign = (s.vAlign ?? 'flex-start') as VAlign;

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        minHeight: minHeight || undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: vAlign,
    };

    const inner = (
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    );

    const overlayEl = overlay ? (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                background: overlay,
                opacity: overlayOpacity,
                pointerEvents: 'none',
            }}
        />
    ) : null;

    // Use React.createElement to allow dynamic tag name
    return React.createElement(
        tag,
        { style: containerStyle, className: 'w-full' },
        overlayEl,
        inner,
    );
}

// ─── Editor (canvas representation) ─────────────────────────────────────────

function Editor({ component, isSelected, onSelect, children }: WidgetEditorProps) {
    const { _tag = 'section' } = component.settings as Record<string, string>;
    const tagLabel = _tag.charAt(0).toUpperCase() + _tag.slice(1);
    return (
        <section
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`relative min-h-[80px] w-full rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-200'}`}
        >
            {isSelected && (
                <div className="absolute right-2 top-1 z-10 rounded bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {tagLabel}
                </div>
            )}
            <div className="p-4">{children}</div>
        </section>
    );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string | undefined>;

    const set = (key: string, value: string) => onChange({ ...s, [key]: value });

    const currentTemplate = s.columnTemplate ?? '1fr';
    const currentTag = (s._tag ?? 'section') as HtmlTag;
    const currentVAlign = (s.vAlign ?? 'flex-start') as VAlign;

    return (
        <div className="space-y-4 p-3">
            {/* Column Layout Presets */}
            <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Column Layout
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                    {LAYOUT_PRESETS.map((preset) => (
                        <button
                            key={preset.template}
                            type="button"
                            title={preset.label}
                            onClick={() => set('columnTemplate', preset.template)}
                            className={`flex flex-col items-center gap-1 rounded border py-2 text-[10px] transition-colors ${
                                currentTemplate === preset.template
                                    ? 'border-[#c2185b] bg-[#c2185b]/10 text-[#c2185b]'
                                    : 'border-gray-200 text-gray-500 hover:border-[#c2185b]/50'
                            }`}
                        >
                            <span className="text-base leading-none">{preset.icon}</span>
                            <span className="leading-tight">{preset.label}</span>
                        </button>
                    ))}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                    Sets the children grid template. Add a Columns widget inside for manual control.
                </p>
            </div>

            {/* Min Height */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Min Height
                </label>
                <div className="flex gap-1">
                    <input
                        type="number"
                        value={(s.minHeight ?? '').replace(/[a-z%]+$/i, '')}
                        onChange={(e) => {
                            const unit = (s.minHeight ?? '200px').match(/[a-z%]+$/i)?.[0] ?? 'px';
                            set('minHeight', e.target.value ? `${e.target.value}${unit}` : '');
                        }}
                        placeholder="200"
                        className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <select
                        value={(s.minHeight ?? '200px').match(/[a-z%]+$/i)?.[0] ?? 'px'}
                        onChange={(e) => {
                            const num = (s.minHeight ?? '').replace(/[a-z%]+$/i, '');
                            set('minHeight', num ? `${num}${e.target.value}` : '');
                        }}
                        className="rounded border border-gray-300 bg-white px-1 py-1 text-sm"
                    >
                        {['px', 'vh', 'em', 'rem', '%'].map((u) => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Vertical alignment */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Vertical Align
                </label>
                <select
                    value={currentVAlign}
                    onChange={(e) => set('vAlign', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                >
                    {VALIGN_OPTIONS.map((v) => (
                        <option key={v} value={v}>{VALIGN_LABELS[v]}</option>
                    ))}
                </select>
            </div>

            {/* Background Overlay */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Background Overlay
                </label>
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={s.overlayColor ?? '#000000'}
                        onChange={(e) => set('overlayColor', e.target.value)}
                        className="h-8 w-10 flex-none cursor-pointer rounded border border-gray-300"
                        aria-label="Overlay color"
                    />
                    <div className="flex flex-1 items-center gap-2">
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={parseFloat(s.overlayOpacity ?? '0')}
                            onChange={(e) => set('overlayOpacity', e.target.value)}
                            aria-label="Overlay opacity"
                            className="flex-1 accent-[#c2185b]"
                        />
                        <span className="w-8 text-right text-[11px] text-gray-500">
                            {parseFloat(s.overlayOpacity ?? '0').toFixed(2)}
                        </span>
                    </div>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                    Set opacity to 0 to disable. Layered over the section background.
                </p>
            </div>

            {/* HTML Tag */}
            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    HTML Tag
                </label>
                <select
                    value={currentTag}
                    onChange={(e) => set('_tag', e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                >
                    {HTML_TAGS.map((t) => (
                        <option key={t} value={t}>&lt;{t}&gt;</option>
                    ))}
                </select>
            </div>

            {/* Sticky toggle */}
            <div className="flex items-center gap-2">
                <input
                    id="section-sticky"
                    type="checkbox"
                    checked={s._sticky === 'true'}
                    onChange={(e) => set('_sticky', e.target.checked ? 'true' : 'false')}
                    className="accent-[#c2185b]"
                />
                <label htmlFor="section-sticky" className="cursor-pointer text-sm text-gray-700">
                    Sticky (pin to top on scroll)
                </label>
            </div>
        </div>
    );
}

// Need React for createElement
import React from 'react';

const def: WidgetDefinition = {
    type: 'section',
    version: 2,
    category: 'layout',
    label: 'Section',
    icon: '▭',
    hasChildren: true,
    defaultSettings: {
        columnTemplate: '1fr',
        minHeight: '200px',
        vAlign: 'flex-start',
        overlayColor: '#000000',
        overlayOpacity: '0',
        _tag: 'section',
        _sticky: 'false',
    },
    defaultStyles: { desktop: { padding: '40px 0' } },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
