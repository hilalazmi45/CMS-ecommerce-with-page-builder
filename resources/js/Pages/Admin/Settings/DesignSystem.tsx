/**
 * A4 — Design System admin page.
 *
 * Allows admins to manage:
 * - Color palette (up to 20 named swatches)
 * - Typography presets (Body, H1–H6, Button, Monospace)
 * - Spacing presets (Small, Medium, Large, XL)
 *
 * Changes are persisted to the `settings` table via PATCH /admin/settings/design-system.
 * Tokens are shared with all Inertia pages via HandleInertiaRequests::share().
 */

import AdminLayout from '@/Layouts/AdminLayout';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps, DesignSystemColor, DesignSystemTypographyPreset, DesignSystemSpacingPreset } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

// ─── Default presets (seeded on first render when settings are empty) ─────────

const DEFAULT_TYPOGRAPHY_PRESETS: DesignSystemTypographyPreset[] = [
    { key: 'body', label: 'Body', fontFamily: 'inherit', fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
    { key: 'h1', label: 'H1', fontFamily: 'inherit', fontSize: '2.25rem', fontWeight: '700', lineHeight: '1.2' },
    { key: 'h2', label: 'H2', fontFamily: 'inherit', fontSize: '1.875rem', fontWeight: '700', lineHeight: '1.25' },
    { key: 'h3', label: 'H3', fontFamily: 'inherit', fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3' },
    { key: 'h4', label: 'H4', fontFamily: 'inherit', fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4' },
    { key: 'h5', label: 'H5', fontFamily: 'inherit', fontSize: '1.125rem', fontWeight: '600', lineHeight: '1.4' },
    { key: 'h6', label: 'H6', fontFamily: 'inherit', fontSize: '1rem', fontWeight: '600', lineHeight: '1.5' },
    { key: 'button', label: 'Button', fontFamily: 'inherit', fontSize: '1rem', fontWeight: '600', lineHeight: '1' },
    { key: 'mono', label: 'Monospace', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '400', lineHeight: '1.6' },
];

const DEFAULT_SPACING_PRESETS: DesignSystemSpacingPreset[] = [
    { key: 'sm', label: 'Small', value: '8px' },
    { key: 'md', label: 'Medium', value: '16px' },
    { key: 'lg', label: 'Large', value: '32px' },
    { key: 'xl', label: 'XL', value: '64px' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props extends PageProps {
    /** Raw values from Setting::get — may be empty arrays on first load. */
    colors: DesignSystemColor[] | null;
    typography: DesignSystemTypographyPreset[] | null;
    spacing: DesignSystemSpacingPreset[] | null;
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
    );
}

function FieldLabel({ text }: { text: string }) {
    return <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{text}</label>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DesignSystem({ colors, typography, spacing }: Props) {
    const { flash } = usePage<PageProps>().props;
    const [palette, setPalette] = useState<DesignSystemColor[]>(
        Array.isArray(colors) && colors.length > 0 ? colors : [],
    );
    const [typo, setTypo] = useState<DesignSystemTypographyPreset[]>(
        Array.isArray(typography) && typography.length > 0 ? typography : DEFAULT_TYPOGRAPHY_PRESETS,
    );
    const [spacingPresets, setSpacingPresets] = useState<DesignSystemSpacingPreset[]>(
        Array.isArray(spacing) && spacing.length > 0 ? spacing : DEFAULT_SPACING_PRESETS,
    );
    const [saving, setSaving] = useState(false);

    async function save() {
        setSaving(true);
        try {
            await fetch(route('admin.settings.design-system.update'), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ colors: palette, typography: typo, spacing: spacingPresets }),
            });
        } finally {
            setSaving(false);
        }
    }

    // ── Color palette ───────────────────────────────────────────────────────

    function addColor() {
        if (palette.length >= 20) return;
        const id = `color-${Date.now()}`;
        setPalette([...palette, { key: id, name: 'New Color', value: '#6366f1' }]);
    }

    function updateColor(index: number, field: keyof DesignSystemColor, val: string) {
        setPalette(palette.map((c, i) => (i === index ? { ...c, [field]: val } : c)));
    }

    function removeColor(index: number) {
        setPalette(palette.filter((_, i) => i !== index));
    }

    // ── Typography ──────────────────────────────────────────────────────────

    function updateTypo(index: number, field: keyof DesignSystemTypographyPreset, val: string) {
        setTypo(typo.map((t, i) => (i === index ? { ...t, [field]: val } : t)));
    }

    // ── Spacing ─────────────────────────────────────────────────────────────

    function addSpacing() {
        setSpacingPresets([...spacingPresets, { key: `sp-${Date.now()}`, label: 'New', value: '0px' }]);
    }

    function updateSpacing(index: number, field: keyof DesignSystemSpacingPreset, val: string) {
        setSpacingPresets(spacingPresets.map((s, i) => (i === index ? { ...s, [field]: val } : s)));
    }

    function removeSpacing(index: number) {
        setSpacingPresets(spacingPresets.filter((_, i) => i !== index));
    }

    return (
        <AdminLayout title="Design System">
            <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
                {/* Flash */}
                {flash.success && (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{flash.success}</div>
                )}
                {flash.error && (
                    <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{flash.error}</div>
                )}

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Design System</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Define global color palette, typography presets, and spacing tokens used across
                            the page builder and storefront.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => { void save(); }}
                        className="rounded-md bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>

                {/* ── Color Palette ─────────────────────────────────────────────────── */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <SectionHeader
                        title="Color Palette"
                        description="Up to 20 named swatches. These appear as quick-picks in the editor color pickers."
                    />

                    <div className="space-y-3">
                        {palette.map((color, i) => (
                            <div key={color.key} className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={color.value}
                                    onChange={(e) => updateColor(i, 'value', e.target.value)}
                                    aria-label={`Color ${i + 1} swatch`}
                                    className="h-9 w-12 flex-none cursor-pointer rounded border border-gray-300"
                                />
                                <div className="flex-1">
                                    <FieldLabel text="Name" />
                                    <input
                                        type="text"
                                        value={color.name}
                                        onChange={(e) => updateColor(i, 'name', e.target.value)}
                                        placeholder="e.g. Primary Blue"
                                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-pink-600 focus:outline-none"
                                    />
                                </div>
                                <div className="w-40">
                                    <FieldLabel text="Value" />
                                    <input
                                        type="text"
                                        value={color.value}
                                        onChange={(e) => updateColor(i, 'value', e.target.value)}
                                        placeholder="#6366f1 or rgba(…)"
                                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-pink-600 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeColor(i)}
                                    aria-label={`Remove ${color.name}`}
                                    className="mt-5 shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {palette.length < 20 && (
                        <button
                            type="button"
                            onClick={addColor}
                            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700"
                        >
                            <Plus size={15} /> Add color
                        </button>
                    )}

                    {/* Palette preview */}
                    {palette.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {palette.map((c) => (
                                <div key={c.key} className="text-center">
                                    <div
                                        className="h-8 w-8 rounded border border-gray-200 shadow-sm"
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                    <p className="mt-0.5 max-w-[48px] truncate text-[10px] text-gray-500">{c.name}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Typography Presets ─────────────────────────────────────────────── */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <SectionHeader
                        title="Typography Presets"
                        description="Global text style presets. Widgets can opt-in to a preset instead of setting individual properties."
                    />

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="pb-2 pr-3">Preset</th>
                                    <th className="pb-2 pr-3">Font Family</th>
                                    <th className="pb-2 pr-3">Size</th>
                                    <th className="pb-2 pr-3">Weight</th>
                                    <th className="pb-2">Line Height</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {typo.map((t, i) => (
                                    <tr key={t.key}>
                                        <td className="py-2 pr-3">
                                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                {t.label}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <input
                                                type="text"
                                                value={t.fontFamily ?? ''}
                                                onChange={(e) => updateTypo(i, 'fontFamily', e.target.value)}
                                                placeholder="inherit"
                                                className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-pink-600 focus:outline-none"
                                            />
                                        </td>
                                        <td className="py-2 pr-3">
                                            <input
                                                type="text"
                                                value={t.fontSize ?? ''}
                                                onChange={(e) => updateTypo(i, 'fontSize', e.target.value)}
                                                placeholder="16px"
                                                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-pink-600 focus:outline-none"
                                            />
                                        </td>
                                        <td className="py-2 pr-3">
                                            <select
                                                value={t.fontWeight ?? '400'}
                                                onChange={(e) => updateTypo(i, 'fontWeight', e.target.value)}
                                                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-pink-600 focus:outline-none"
                                            >
                                                {['100','200','300','400','500','600','700','800','900'].map((w) => (
                                                    <option key={w} value={w}>{w}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2">
                                            <input
                                                type="text"
                                                value={t.lineHeight ?? ''}
                                                onChange={(e) => updateTypo(i, 'lineHeight', e.target.value)}
                                                placeholder="1.5"
                                                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-pink-600 focus:outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ── Spacing Presets ─────────────────────────────────────────────────── */}
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <SectionHeader
                        title="Spacing Presets"
                        description="Named spacing values shown as quick-picks in padding/margin controls."
                    />

                    <div className="space-y-2">
                        {spacingPresets.map((sp, i) => (
                            <div key={sp.key} className="flex items-center gap-3">
                                <div className="w-28">
                                    <FieldLabel text="Label" />
                                    <input
                                        type="text"
                                        value={sp.label}
                                        onChange={(e) => updateSpacing(i, 'label', e.target.value)}
                                        placeholder="Small"
                                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-pink-600 focus:outline-none"
                                    />
                                </div>
                                <div className="w-32">
                                    <FieldLabel text="Value" />
                                    <input
                                        type="text"
                                        value={sp.value}
                                        onChange={(e) => updateSpacing(i, 'value', e.target.value)}
                                        placeholder="8px"
                                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-pink-600 focus:outline-none"
                                    />
                                </div>
                                {/* Visual preview */}
                                <div className="mt-4 flex items-center">
                                    <div className="h-4 bg-pink-200" style={{ width: sp.value }} title={sp.value} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeSpacing(i)}
                                    aria-label={`Remove ${sp.label}`}
                                    className="mt-5 shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addSpacing}
                        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:text-pink-700"
                    >
                        <Plus size={15} /> Add spacing preset
                    </button>
                </section>

                {/* Bottom save */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => { void save(); }}
                        className="rounded-md bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
