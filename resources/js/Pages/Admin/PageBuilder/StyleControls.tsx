/**
 * StyleControls — Elementor-style grouped style panel for the page builder editor.
 *
 * Replaces the flat StyleControls in Editor.tsx with collapsible groups:
 *   Typography · Spacing · Background · Border · Effects · Advanced
 *
 * All controls write to the active device breakpoint's own overrides.
 * Inherits are shown as placeholder values from the resolved (desktop→tablet→mobile) style.
 * Strict TypeScript — no `any`.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Link, Unlink } from 'lucide-react';
import type { ComponentStyle, PageComponent, ResponsiveStyles } from '@/pageBuilder/types';
import {
    buildFilter,
    buildLinearGradient,
    buildTransform,
    composeSpacing,
} from '@/pageBuilder/render/renderStyles';
import { ANIMATION_LABELS, ANIMATION_NAMES } from '@/pageBuilder/animations';

// ─── Types ────────────────────────────────────────────────────────────────────

type Device = 'desktop' | 'tablet' | 'mobile';

// Re-export the resolved-style helper used in Editor.tsx (so it's accessible here)
function resolvedDeviceStyle(component: PageComponent, device: Device): ComponentStyle {
    const s = component.styles ?? {};
    const desktop = s.desktop ?? {};
    if (device === 'tablet') return { ...desktop, ...(s.tablet ?? {}) };
    if (device === 'mobile') return { ...desktop, ...(s.tablet ?? {}), ...(s.mobile ?? {}) };
    return desktop;
}

const DEVICE_LABEL: Record<Device, string> = {
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
};

// ─── Common font families (no network fetch needed) ───────────────────────────
const FONT_FAMILIES = [
    'inherit',
    'Arial',
    'Georgia',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS',
    // Google Fonts (loaded by the browser if the page uses them)
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Nunito',
    'Poppins',
    'Playfair Display',
    'Merriweather',
    'Source Sans Pro',
];

const FONT_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];

const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'];
const TEXT_DECORATIONS = ['none', 'underline', 'line-through', 'overline'];
const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'];
const BLEND_MODES = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
    'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];
const OVERFLOW_OPTIONS = ['visible', 'hidden', 'scroll', 'auto'];
const BG_SIZES = ['cover', 'contain', 'auto', '100% 100%'];
const BG_POSITIONS = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
const BG_REPEATS = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'];
const BG_ATTACHMENTS = ['scroll', 'fixed', 'local'];
const BORDER_STYLES_LIST = ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'];

// ─── Small reusable sub-components ───────────────────────────────────────────

function Label({ text }: { text: string }) {
    return (
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {text}
        </label>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <Label text={label} />
            {children}
        </div>
    );
}

function Input({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = '',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: 'text' | 'number' | 'color';
    className?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none ${className}`}
        />
    );
}

function Select({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
        >
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    );
}

function UnitInput({
    value,
    onChange,
    placeholder,
    units,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    units: string[];
}) {
    // Parse "12px" → num="12", unit="px"
    const match = value.match(/^(-?\d*\.?\d+)(.*)$/);
    const numStr = match ? match[1]! : '';
    const unitStr = match ? match[2]!.trim() : units[0] ?? 'px';

    return (
        <div className="flex gap-1">
            <input
                type="number"
                value={numStr}
                placeholder={placeholder}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(v === '' ? '' : `${v}${unitStr}`);
                }}
                className="min-w-0 flex-1 rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
            />
            <select
                value={unitStr}
                onChange={(e) => {
                    onChange(numStr === '' ? '' : `${numStr}${e.target.value}`);
                }}
                className="rounded border border-gray-300 bg-white px-1 py-1 text-xs focus:border-[#c2185b] focus:outline-none"
            >
                {units.map((u) => (
                    <option key={u} value={u}>
                        {u}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── Collapsible group wrapper ────────────────────────────────────────────────

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-50"
                aria-expanded={open}
            >
                {title}
                {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
        </div>
    );
}

// ─── Per-side spacing control with link toggle ────────────────────────────────

function SpacingControl({
    prefix,
    own,
    inherited,
    onSet,
}: {
    prefix: 'padding' | 'margin';
    own: ComponentStyle;
    inherited: ComponentStyle;
    onSet: (updates: Partial<ComponentStyle>) => void;
}) {
    const [linked, setLinked] = useState(false);
    const unit = 'px';

    // Extract current per-side values (own first, inherited as fallback for display)
    const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map((side) => {
        const key = `${prefix}${side}`;
        return { side, key, value: own[key] ?? '' };
    });

    // Parse num from "12px" → "12"
    const numOf = (v: string): string => {
        const m = v.match(/-?\d+(\.\d+)?/);
        return m ? m[0] : '';
    };

    const handleChange = (key: string, rawNum: string) => {
        const v = rawNum === '' ? '' : `${rawNum}${unit}`;
        if (linked) {
            // Apply to all four sides
            const updates = composeSpacing(
                prefix,
                {
                    top: v,
                    right: v,
                    bottom: v,
                    left: v,
                },
                true,
            );
            onSet(updates);
        } else {
            onSet({ [key]: v });
        }
    };

    return (
        <FieldRow label={prefix}>
            <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {sides.map(({ side, key, value }) => (
                        <div key={side}>
                            <input
                                type="number"
                                value={numOf(value)}
                                placeholder={numOf(inherited[key] ?? '') || '0'}
                                onChange={(e) => handleChange(key, e.target.value)}
                                aria-label={`${prefix} ${side}`}
                                className="w-full rounded border border-gray-300 px-1.5 py-1 text-center text-sm focus:border-[#c2185b] focus:outline-none"
                            />
                            <span className="mt-0.5 block text-center text-[10px] text-gray-400">{side}</span>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => setLinked((v) => !v)}
                    title={linked ? 'Unlink sides' : 'Link all sides'}
                    aria-pressed={linked}
                    className={`mt-0.5 rounded p-1 transition-colors ${linked ? 'text-[#c2185b]' : 'text-gray-400 hover:text-gray-700'}`}
                >
                    {linked ? <Link size={13} /> : <Unlink size={13} />}
                </button>
            </div>
        </FieldRow>
    );
}

// ─── Border radius control with per-corner toggle ─────────────────────────────

function RadiusControl({
    own,
    inherited,
    onSet,
}: {
    own: ComponentStyle;
    inherited: ComponentStyle;
    onSet: (updates: Partial<ComponentStyle>) => void;
}) {
    const [perCorner, setPerCorner] = useState(false);
    const unit = 'px';
    const numOf = (v: string | undefined): string => {
        if (!v) return '';
        const m = v.match(/\d+(\.\d+)?/);
        return m ? m[0] : '';
    };

    if (!perCorner) {
        return (
            <FieldRow label="Border Radius">
                <div className="flex gap-2">
                    <UnitInput
                        value={own.borderRadius ?? ''}
                        onChange={(v) => onSet({ borderRadius: v })}
                        placeholder={numOf(inherited.borderRadius) || '0'}
                        units={['px', 'em', 'rem', '%']}
                    />
                    <button
                        type="button"
                        title="Per corner"
                        onClick={() => setPerCorner(true)}
                        className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:border-[#c2185b] hover:text-[#c2185b]"
                    >
                        Corners
                    </button>
                </div>
            </FieldRow>
        );
    }

    const corners = [
        { key: 'borderTopLeftRadius', label: 'TL' },
        { key: 'borderTopRightRadius', label: 'TR' },
        { key: 'borderBottomRightRadius', label: 'BR' },
        { key: 'borderBottomLeftRadius', label: 'BL' },
    ] as const;

    return (
        <FieldRow label="Border Radius">
            <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {corners.map(({ key, label }) => (
                        <div key={key}>
                            <input
                                type="number"
                                value={numOf(own[key])}
                                placeholder={numOf(inherited[key]) || '0'}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    onSet({ [key]: v === '' ? '' : `${v}${unit}` });
                                }}
                                aria-label={`border radius ${label}`}
                                className="w-full rounded border border-gray-300 px-1.5 py-1 text-center text-sm focus:border-[#c2185b] focus:outline-none"
                            />
                            <span className="mt-0.5 block text-center text-[10px] text-gray-400">{label}</span>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    title="Single radius"
                    onClick={() => setPerCorner(false)}
                    className="mt-0.5 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:border-[#c2185b] hover:text-[#c2185b]"
                >
                    Single
                </button>
            </div>
        </FieldRow>
    );
}

// ─── CSS Filter control ───────────────────────────────────────────────────────

interface FilterValues {
    blur: number;
    brightness: number;
    contrast: number;
    saturate: number;
    hueRotate: number;
}

function parseFilter(filterStr: string | undefined): FilterValues {
    const def: FilterValues = { blur: 0, brightness: 100, contrast: 100, saturate: 100, hueRotate: 0 };
    if (!filterStr) return def;
    const blur = filterStr.match(/blur\((\d+(?:\.\d+)?)px\)/);
    const brightness = filterStr.match(/brightness\((\d+(?:\.\d+)?)%\)/);
    const contrast = filterStr.match(/contrast\((\d+(?:\.\d+)?)%\)/);
    const saturate = filterStr.match(/saturate\((\d+(?:\.\d+)?)%\)/);
    const hue = filterStr.match(/hue-rotate\((\d+(?:\.\d+)?)deg\)/);
    return {
        blur: blur ? parseFloat(blur[1]!) : def.blur,
        brightness: brightness ? parseFloat(brightness[1]!) : def.brightness,
        contrast: contrast ? parseFloat(contrast[1]!) : def.contrast,
        saturate: saturate ? parseFloat(saturate[1]!) : def.saturate,
        hueRotate: hue ? parseFloat(hue[1]!) : def.hueRotate,
    };
}

function FilterControl({
    value,
    onChange,
}: {
    value: string | undefined;
    onChange: (css: string) => void;
}) {
    const vals = parseFilter(value);

    const update = (key: keyof FilterValues, num: number) => {
        const next = { ...vals, [key]: num };
        const css = buildFilter(next);
        onChange(css);
    };

    const sliders: { key: keyof FilterValues; label: string; min: number; max: number; step: number; unit: string }[] = [
        { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5, unit: 'px' },
        { key: 'brightness', label: 'Brightness', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'contrast', label: 'Contrast', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'saturate', label: 'Saturate', min: 0, max: 200, step: 1, unit: '%' },
        { key: 'hueRotate', label: 'Hue Rotate', min: 0, max: 360, step: 1, unit: 'deg' },
    ];

    return (
        <div className="space-y-2">
            {sliders.map(({ key, label, min, max, step, unit }) => (
                <div key={key}>
                    <div className="mb-0.5 flex justify-between text-[11px] text-gray-500">
                        <span>{label}</span>
                        <span>{vals[key]}{unit}</span>
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={vals[key]}
                        onChange={(e) => update(key, parseFloat(e.target.value))}
                        aria-label={label}
                        className="w-full accent-[#c2185b]"
                    />
                </div>
            ))}
        </div>
    );
}

// ─── CSS Transform control ────────────────────────────────────────────────────

interface TransformValues {
    rotate: number;
    scale: number;
    translateX: number;
    translateY: number;
    skewX: number;
    skewY: number;
}

function parseTransform(transformStr: string | undefined): TransformValues {
    const def: TransformValues = { rotate: 0, scale: 1, translateX: 0, translateY: 0, skewX: 0, skewY: 0 };
    if (!transformStr) return def;
    const rotate = transformStr.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
    const scale = transformStr.match(/scale\((-?\d+(?:\.\d+)?)\)/);
    const tx = transformStr.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
    const ty = transformStr.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
    const sx = transformStr.match(/skewX\((-?\d+(?:\.\d+)?)deg\)/);
    const sy = transformStr.match(/skewY\((-?\d+(?:\.\d+)?)deg\)/);
    return {
        rotate: rotate ? parseFloat(rotate[1]!) : def.rotate,
        scale: scale ? parseFloat(scale[1]!) : def.scale,
        translateX: tx ? parseFloat(tx[1]!) : def.translateX,
        translateY: ty ? parseFloat(ty[1]!) : def.translateY,
        skewX: sx ? parseFloat(sx[1]!) : def.skewX,
        skewY: sy ? parseFloat(sy[1]!) : def.skewY,
    };
}

function TransformControl({
    value,
    onChange,
}: {
    value: string | undefined;
    onChange: (css: string) => void;
}) {
    const vals = parseTransform(value);

    const update = (key: keyof TransformValues, num: number) => {
        const next = { ...vals, [key]: num };
        const css = buildTransform(next);
        onChange(css);
    };

    const fields: { key: keyof TransformValues; label: string; min: number; max: number; step: number }[] = [
        { key: 'rotate', label: 'Rotate (deg)', min: -360, max: 360, step: 1 },
        { key: 'scale', label: 'Scale', min: 0, max: 5, step: 0.01 },
        { key: 'translateX', label: 'Translate X (px)', min: -500, max: 500, step: 1 },
        { key: 'translateY', label: 'Translate Y (px)', min: -500, max: 500, step: 1 },
        { key: 'skewX', label: 'Skew X (deg)', min: -90, max: 90, step: 1 },
        { key: 'skewY', label: 'Skew Y (deg)', min: -90, max: 90, step: 1 },
    ];

    return (
        <div className="space-y-2">
            {fields.map(({ key, label, min, max, step }) => (
                <div key={key}>
                    <div className="mb-0.5 flex justify-between text-[11px] text-gray-500">
                        <span>{label}</span>
                        <span>{vals[key]}</span>
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={vals[key]}
                        onChange={(e) => update(key, parseFloat(e.target.value))}
                        aria-label={label}
                        className="w-full accent-[#c2185b]"
                    />
                </div>
            ))}
        </div>
    );
}

// ─── Background group ─────────────────────────────────────────────────────────

type BgMode = 'color' | 'gradient' | 'image';

function BackgroundGroup({
    own,
    inherited,
    onSet,
    palette,
}: {
    own: ComponentStyle;
    inherited: ComponentStyle;
    onSet: (updates: Partial<ComponentStyle>) => void;
    palette?: DesignSystemColor[];
}) {
    const detectMode = (): BgMode => {
        const bg = own.background ?? inherited.background ?? '';
        if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) return 'gradient';
        if (own.backgroundImage && own.backgroundImage !== 'none') return 'image';
        return 'color';
    };

    const [mode, setMode] = useState<BgMode>(detectMode);

    // Gradient state
    const [gradAngle, setGradAngle] = useState(135);
    const [gradColor1, setGradColor1] = useState('#ffffff');
    const [gradColor2, setGradColor2] = useState('#000000');

    const applyGradient = (angle: number, c1: string, c2: string) => {
        onSet({ background: buildLinearGradient(angle, c1, c2) });
    };

    return (
        <div className="space-y-2">
            {/* Mode selector */}
            <div className="flex gap-1 rounded border border-gray-200 p-0.5 text-[11px]">
                {(['color', 'gradient', 'image'] as BgMode[]).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded py-1 capitalize transition-colors ${mode === m ? 'bg-[#c2185b] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {mode === 'color' && (
                <div>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={own.backgroundColor ?? (own.background?.startsWith('#') ? own.background : '#ffffff')}
                            onChange={(e) => onSet({ backgroundColor: e.target.value, background: e.target.value })}
                            className="h-8 w-10 flex-none cursor-pointer rounded border border-gray-300"
                            aria-label="Background color"
                        />
                        <Input
                            value={own.background ?? ''}
                            onChange={(v) => onSet({ background: v })}
                            placeholder={inherited.background ?? '#fff / rgba(...)'}
                        />
                    </div>
                    {palette && (
                        <PaletteSwatches
                            palette={palette}
                            onPick={(v) => onSet({ backgroundColor: v, background: v })}
                        />
                    )}
                </div>
            )}

            {mode === 'gradient' && (
                <div className="space-y-2">
                    <FieldRow label="Angle (deg)">
                        <input
                            type="range"
                            min={0}
                            max={360}
                            value={gradAngle}
                            onChange={(e) => {
                                const a = parseInt(e.target.value);
                                setGradAngle(a);
                                applyGradient(a, gradColor1, gradColor2);
                            }}
                            aria-label="Gradient angle"
                            className="w-full accent-[#c2185b]"
                        />
                        <span className="text-[11px] text-gray-500">{gradAngle}°</span>
                    </FieldRow>
                    <div className="flex gap-3">
                        <FieldRow label="Color 1">
                            <input
                                type="color"
                                value={gradColor1}
                                onChange={(e) => {
                                    setGradColor1(e.target.value);
                                    applyGradient(gradAngle, e.target.value, gradColor2);
                                }}
                                className="h-8 w-full cursor-pointer rounded border border-gray-300"
                                aria-label="Gradient color 1"
                            />
                        </FieldRow>
                        <FieldRow label="Color 2">
                            <input
                                type="color"
                                value={gradColor2}
                                onChange={(e) => {
                                    setGradColor2(e.target.value);
                                    applyGradient(gradAngle, gradColor1, e.target.value);
                                }}
                                className="h-8 w-full cursor-pointer rounded border border-gray-300"
                                aria-label="Gradient color 2"
                            />
                        </FieldRow>
                    </div>
                </div>
            )}

            {mode === 'image' && (
                <div className="space-y-2">
                    <FieldRow label="Image URL">
                        <Input
                            value={own.backgroundImage ?? ''}
                            onChange={(v) => onSet({ backgroundImage: v ? `url('${v}')` : '' })}
                            placeholder="https://..."
                        />
                    </FieldRow>
                    <div className="grid grid-cols-2 gap-2">
                        <FieldRow label="Size">
                            <Select
                                value={own.backgroundSize ?? 'cover'}
                                onChange={(v) => onSet({ backgroundSize: v })}
                                options={BG_SIZES}
                            />
                        </FieldRow>
                        <FieldRow label="Position">
                            <Select
                                value={own.backgroundPosition ?? 'center'}
                                onChange={(v) => onSet({ backgroundPosition: v })}
                                options={BG_POSITIONS}
                            />
                        </FieldRow>
                        <FieldRow label="Repeat">
                            <Select
                                value={own.backgroundRepeat ?? 'no-repeat'}
                                onChange={(v) => onSet({ backgroundRepeat: v })}
                                options={BG_REPEATS}
                            />
                        </FieldRow>
                        <FieldRow label="Attachment">
                            <Select
                                value={own.backgroundAttachment ?? 'scroll'}
                                onChange={(v) => onSet({ backgroundAttachment: v })}
                                options={BG_ATTACHMENTS}
                            />
                        </FieldRow>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── A4: Design-system color palette quick-picks ─────────────────────────────

export interface DesignSystemColor {
    key: string;
    name: string;
    value: string;
}

/**
 * Small swatch strip shown inside color-picker rows.
 * Clicking a swatch calls onChange with the swatch value.
 */
function PaletteSwatches({
    palette,
    onPick,
}: {
    palette: DesignSystemColor[];
    onPick: (value: string) => void;
}) {
    if (palette.length === 0) return null;
    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {palette.map((swatch) => (
                <button
                    key={swatch.key}
                    type="button"
                    title={swatch.name}
                    aria-label={`Pick ${swatch.name}`}
                    onClick={() => onPick(swatch.value)}
                    className="h-5 w-5 rounded-sm border border-gray-300 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#c2185b]"
                    style={{ backgroundColor: swatch.value }}
                />
            ))}
        </div>
    );
}

// ─── Main StyleControls export ────────────────────────────────────────────────

export interface DesignSystemTokens {
    colors: DesignSystemColor[];
    typography: Array<{
        key: string;
        label: string;
        fontFamily?: string;
        fontSize?: string;
        fontWeight?: string;
        lineHeight?: string;
    }>;
    spacing: Array<{ key: string; label: string; value: string }>;
}

interface StyleControlsProps {
    component: PageComponent;
    device: Device;
    onStyleChange: (s: ResponsiveStyles) => void;
    /** A4: optional design-system tokens for palette quick-picks */
    designSystem?: DesignSystemTokens;
}

/**
 * Elementor-style grouped style panel.
 * Writes only to the active device breakpoint's own overrides.
 */
export function StyleControls({ component, device, onStyleChange, designSystem }: StyleControlsProps) {
    const own: ComponentStyle = component.styles?.[device] ?? {};
    const inherited = resolvedDeviceStyle(component, device);

    // Apply a partial update to the active breakpoint only
    const set = (updates: Partial<ComponentStyle>) => {
        const next: ComponentStyle = { ...own };
        for (const [k, v] of Object.entries(updates)) {
            if (v === '' || v === undefined) {
                delete next[k];
            } else {
                next[k] = v;
            }
        }
        onStyleChange({ ...component.styles, [device]: next });
    };

    const setKey = (key: keyof ComponentStyle, value: string) => {
        set({ [key]: value });
    };

    return (
        <div className="divide-y divide-gray-100">
            {/* Device indicator */}
            <div className="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                Editing{' '}
                <span className="font-semibold text-[#c2185b]">{DEVICE_LABEL[device]}</span>
                {device !== 'desktop' && (
                    <span>· inherits Desktop unless overridden</span>
                )}
            </div>

            {/* ── Typography ── */}
            <Group title="Typography">
                <FieldRow label="Font Family">
                    <datalist id="font-list">
                        {FONT_FAMILIES.map((f) => (
                            <option key={f} value={f} />
                        ))}
                    </datalist>
                    <input
                        type="text"
                        list="font-list"
                        value={own.fontFamily ?? ''}
                        onChange={(e) => setKey('fontFamily', e.target.value)}
                        placeholder={inherited.fontFamily ?? 'inherit'}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
                    />
                </FieldRow>

                <div className="grid grid-cols-2 gap-2">
                    <FieldRow label="Size">
                        <UnitInput
                            value={own.fontSize ?? ''}
                            onChange={(v) => setKey('fontSize', v)}
                            placeholder={inherited.fontSize ?? '16'}
                            units={['px', 'em', 'rem', 'vw', '%']}
                        />
                    </FieldRow>
                    <FieldRow label="Weight">
                        <Select
                            value={own.fontWeight ?? (inherited.fontWeight ?? '400')}
                            onChange={(v) => setKey('fontWeight', v)}
                            options={FONT_WEIGHTS}
                        />
                    </FieldRow>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <FieldRow label="Line Height">
                        <UnitInput
                            value={own.lineHeight ?? ''}
                            onChange={(v) => setKey('lineHeight', v)}
                            placeholder={inherited.lineHeight ?? '1.5'}
                            units={['', 'px', 'em', 'rem']}
                        />
                    </FieldRow>
                    <FieldRow label="Letter Spacing">
                        <UnitInput
                            value={own.letterSpacing ?? ''}
                            onChange={(v) => setKey('letterSpacing', v)}
                            placeholder={inherited.letterSpacing ?? '0'}
                            units={['px', 'em', 'rem']}
                        />
                    </FieldRow>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <FieldRow label="Text Align">
                        <Select
                            value={own.textAlign ?? (inherited.textAlign ?? 'left')}
                            onChange={(v) => setKey('textAlign', v)}
                            options={TEXT_ALIGNS}
                        />
                    </FieldRow>
                    <FieldRow label="Transform">
                        <Select
                            value={own.textTransform ?? (inherited.textTransform ?? 'none')}
                            onChange={(v) => setKey('textTransform', v)}
                            options={TEXT_TRANSFORMS}
                        />
                    </FieldRow>
                </div>

                <FieldRow label="Decoration">
                    <Select
                        value={own.textDecoration ?? (inherited.textDecoration ?? 'none')}
                        onChange={(v) => setKey('textDecoration', v)}
                        options={TEXT_DECORATIONS}
                    />
                </FieldRow>

                <FieldRow label="Color">
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={own.color ?? inherited.color ?? '#111827'}
                            onChange={(e) => setKey('color', e.target.value)}
                            className="h-8 w-10 flex-none cursor-pointer rounded border border-gray-300"
                            aria-label="Text color"
                        />
                        <Input
                            value={own.color ?? ''}
                            onChange={(v) => setKey('color', v)}
                            placeholder={inherited.color ?? '#111827'}
                        />
                    </div>
                    {designSystem && (
                        <PaletteSwatches
                            palette={designSystem.colors}
                            onPick={(v) => setKey('color', v)}
                        />
                    )}
                </FieldRow>
            </Group>

            {/* ── Spacing ── */}
            <Group title="Spacing">
                <SpacingControl prefix="padding" own={own} inherited={inherited} onSet={set} />
                <SpacingControl prefix="margin" own={own} inherited={inherited} onSet={set} />
            </Group>

            {/* ── Background ── */}
            <Group title="Background" defaultOpen={false}>
                <BackgroundGroup
                    own={own}
                    inherited={inherited}
                    onSet={set}
                    palette={designSystem?.colors}
                />
            </Group>

            {/* ── Border ── */}
            <Group title="Border" defaultOpen={false}>
                <div className="grid grid-cols-3 gap-2">
                    <FieldRow label="Width">
                        <UnitInput
                            value={own.borderWidth ?? ''}
                            onChange={(v) => setKey('borderWidth', v)}
                            placeholder={inherited.borderWidth ?? '0'}
                            units={['px', 'em', 'rem']}
                        />
                    </FieldRow>
                    <FieldRow label="Style">
                        <Select
                            value={own.borderStyle ?? (inherited.borderStyle ?? 'solid')}
                            onChange={(v) => setKey('borderStyle', v)}
                            options={BORDER_STYLES_LIST}
                        />
                    </FieldRow>
                    <FieldRow label="Color">
                        <input
                            type="color"
                            value={own.borderColor ?? inherited.borderColor ?? '#e5e7eb'}
                            onChange={(e) => setKey('borderColor', e.target.value)}
                            className="h-8 w-full cursor-pointer rounded border border-gray-300"
                            aria-label="Border color"
                        />
                    </FieldRow>
                </div>
                <RadiusControl own={own} inherited={inherited} onSet={set} />
                <FieldRow label="Box Shadow">
                    <Input
                        value={own.boxShadow ?? ''}
                        onChange={(v) => setKey('boxShadow', v)}
                        placeholder={inherited.boxShadow ?? '0 4px 12px rgba(0,0,0,.1)'}
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">e.g. 0 2px 8px rgba(0,0,0,.15)</p>
                </FieldRow>
            </Group>

            {/* ── Effects ── */}
            <Group title="Effects" defaultOpen={false}>
                <FieldRow label="Opacity">
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={parseFloat(own.opacity ?? (inherited.opacity ?? '1'))}
                            onChange={(e) => setKey('opacity', e.target.value)}
                            aria-label="Opacity"
                            className="flex-1 accent-[#c2185b]"
                        />
                        <span className="w-8 text-right text-[11px] text-gray-500">
                            {parseFloat(own.opacity ?? (inherited.opacity ?? '1')).toFixed(2)}
                        </span>
                    </div>
                </FieldRow>

                <FieldRow label="Blend Mode">
                    <Select
                        value={own.mixBlendMode ?? (inherited.mixBlendMode ?? 'normal')}
                        onChange={(v) => setKey('mixBlendMode', v)}
                        options={BLEND_MODES}
                    />
                </FieldRow>

                <FieldRow label="CSS Filter">
                    <FilterControl
                        value={own.filter ?? inherited.filter}
                        onChange={(v) => setKey('filter', v)}
                    />
                </FieldRow>

                <FieldRow label="Transform">
                    <TransformControl
                        value={own.transform ?? inherited.transform}
                        onChange={(v) => setKey('transform', v)}
                    />
                </FieldRow>
            </Group>

            {/* ── Advanced ── */}
            <Group title="Advanced" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-2">
                    <FieldRow label="Z-Index">
                        <Input
                            type="number"
                            value={own.zIndex ?? ''}
                            onChange={(v) => setKey('zIndex', v)}
                            placeholder={inherited.zIndex ?? 'auto'}
                        />
                    </FieldRow>
                    <FieldRow label="Overflow">
                        <Select
                            value={own.overflow ?? (inherited.overflow ?? 'visible')}
                            onChange={(v) => setKey('overflow', v)}
                            options={OVERFLOW_OPTIONS}
                        />
                    </FieldRow>
                </div>
                <FieldRow label="Min Height">
                    <UnitInput
                        value={own.minHeight ?? ''}
                        onChange={(v) => setKey('minHeight', v)}
                        placeholder={inherited.minHeight ?? ''}
                        units={['px', 'vh', 'em', 'rem', '%']}
                    />
                </FieldRow>
                <FieldRow label="Max Width">
                    <UnitInput
                        value={own.maxWidth ?? ''}
                        onChange={(v) => setKey('maxWidth', v)}
                        placeholder={inherited.maxWidth ?? ''}
                        units={['px', '%', 'vw', 'em', 'rem']}
                    />
                </FieldRow>
            </Group>
        </div>
    );
}

/**
 * AdvancedControls — Advanced tab: animation, CSS ID, CSS classes, custom CSS.
 * Extended with A5 entrance animation controls.
 */
export function AdvancedControls({
    component,
    onChange,
}: {
    component: PageComponent;
    onChange: (s: Record<string, unknown>) => void;
}) {
    const s = component.settings;
    return (
        <div className="space-y-3 p-3">
            {/* ── A5: Entrance Animation ─────────────────────────────────── */}
            <div className="rounded border border-gray-100 bg-gray-50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Entrance Animation
                </p>
                <div className="space-y-2">
                    <div>
                        <label className="mb-1 block text-[11px] text-gray-500">Animation</label>
                        <select
                            value={(s._animation as string) ?? 'none'}
                            onChange={(e) => onChange({ ...s, _animation: e.target.value })}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
                        >
                            {ANIMATION_NAMES.map((name) => (
                                <option key={name} value={name}>
                                    {ANIMATION_LABELS[name]}
                                </option>
                            ))}
                        </select>
                    </div>
                    {(s._animation as string | undefined) && (s._animation as string) !== 'none' && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] text-gray-500">Duration (ms)</label>
                                <input
                                    type="number"
                                    min={100}
                                    max={5000}
                                    step={100}
                                    value={(s._animDuration as number) ?? 600}
                                    onChange={(e) => onChange({ ...s, _animDuration: parseInt(e.target.value) || 600 })}
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] text-gray-500">Delay (ms)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={5000}
                                    step={100}
                                    value={(s._animDelay as number) ?? 0}
                                    onChange={(e) => onChange({ ...s, _animDelay: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#c2185b] focus:outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                    Plays once when the element scrolls into view on the storefront.
                    Respects the visitor&rsquo;s &ldquo;reduce motion&rdquo; OS preference.
                </p>
            </div>

            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Navigator Label
                </label>
                <input
                    type="text"
                    value={(s._label as string) ?? ''}
                    onChange={(e) => onChange({ ...s, _label: e.target.value })}
                    placeholder="e.g. Product reel"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-400">Friendly name shown in the Structure panel.</p>
            </div>

            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    CSS ID
                </label>
                <input
                    type="text"
                    value={(s._cssId as string) ?? ''}
                    onChange={(e) => onChange({ ...s, _cssId: e.target.value })}
                    placeholder="my-section"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                    Sets <code>id</code> on the rendered element. Use without the #.
                </p>
            </div>

            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    CSS Classes
                </label>
                <input
                    type="text"
                    value={(s._cssClass as string) ?? ''}
                    onChange={(e) => onChange({ ...s, _cssClass: e.target.value })}
                    placeholder="custom-class another"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>

            <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Custom CSS
                </label>
                <textarea
                    value={(s._customCss as string) ?? ''}
                    onChange={(e) => onChange({ ...s, _customCss: e.target.value })}
                    placeholder={`.selector {\n  property: value;\n}`}
                    rows={6}
                    spellCheck={false}
                    className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                    Scoped to <code>#el-{(s._cssId as string) || component.id}</code>. Injected on the storefront.
                </p>
            </div>

            <p className="rounded bg-gray-50 p-2 text-[11px] text-gray-400">
                Applied live to the element on the canvas and the published page.
            </p>
        </div>
    );
}
