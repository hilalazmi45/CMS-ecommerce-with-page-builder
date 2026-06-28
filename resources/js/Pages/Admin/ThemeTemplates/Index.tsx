import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router } from '@inertiajs/react';
import { Edit, LayoutTemplate, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Condition {
    mode: 'include' | 'exclude';
    rule: string;
    // Index signature required for Inertia's FormDataConvertible compatibility.
    [key: string]: string;
}

interface ThemeTemplate {
    ulid: string;
    name: string;
    type: string;
    is_active: boolean;
    conditions: Condition[];
    updateConditionsUrl: string;
    editUrl: string;
}

interface Props {
    templates: ThemeTemplate[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
    header: 'bg-blue-100 text-blue-700',
    footer: 'bg-purple-100 text-purple-700',
    product: 'bg-orange-100 text-orange-700',
    single: 'bg-teal-100 text-teal-700',
    archive: 'bg-indigo-100 text-indigo-700',
    theme: 'bg-gray-100 text-gray-700',
};

function typeBadgeClass(type: string): string {
    return TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600';
}

// ─── Rule builder helpers ─────────────────────────────────────────────────────

type RuleType =
    | 'entire_site'
    | 'front_page'
    | 'e404'
    | 'singular:product'
    | 'singular:cms_page'
    | 'archive:product_category'
    | 'archive:product_brand';

const RULE_TYPES: { value: RuleType; label: string; hasId: boolean }[] = [
    { value: 'entire_site', label: 'Entire site', hasId: false },
    { value: 'front_page', label: 'Front page (homepage)', hasId: false },
    { value: 'e404', label: '404 page', hasId: false },
    { value: 'singular:product', label: 'Single product', hasId: true },
    { value: 'singular:cms_page', label: 'Single CMS page', hasId: true },
    { value: 'archive:product_category', label: 'Product category archive', hasId: true },
    { value: 'archive:product_brand', label: 'Brand archive', hasId: true },
];

function buildRuleString(ruleType: RuleType, entityId: string): string {
    const def = RULE_TYPES.find((r) => r.value === ruleType);
    if (!def) return ruleType;
    if (def.hasId && entityId.trim() !== '') {
        return `${ruleType}:${entityId.trim()}`;
    }
    return ruleType;
}

function parseRuleString(rule: string): { ruleType: RuleType; entityId: string } {
    for (const def of RULE_TYPES) {
        if (rule === def.value) {
            return { ruleType: def.value, entityId: '' };
        }
        if (rule.startsWith(def.value + ':')) {
            const id = rule.slice(def.value.length + 1);
            return { ruleType: def.value, entityId: id };
        }
    }
    // Fallback
    return { ruleType: 'entire_site', entityId: '' };
}

// ─── Conditions editor modal ──────────────────────────────────────────────────

interface ConditionRow {
    mode: 'include' | 'exclude';
    ruleType: RuleType;
    entityId: string;
}

interface ConditionsModalProps {
    template: ThemeTemplate;
    onClose: () => void;
}

function ConditionsModal({ template, onClose }: ConditionsModalProps) {
    const [rows, setRows] = useState<ConditionRow[]>(() =>
        template.conditions.length > 0
            ? template.conditions.map((c) => {
                  const { ruleType, entityId } = parseRuleString(c.rule);
                  return { mode: c.mode, ruleType, entityId };
              })
            : [],
    );
    const [saving, setSaving] = useState(false);

    function addRow() {
        setRows((prev) => [
            ...prev,
            { mode: 'include', ruleType: 'entire_site', entityId: '' },
        ]);
    }

    function removeRow(idx: number) {
        setRows((prev) => prev.filter((_, i) => i !== idx));
    }

    function updateRow<K extends keyof ConditionRow>(
        idx: number,
        key: K,
        value: ConditionRow[K],
    ) {
        setRows((prev) =>
            prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
        );
    }

    function handleSave() {
        setSaving(true);

        const conditions: Condition[] = rows.map((row) => ({
            mode: row.mode,
            rule: buildRuleString(row.ruleType, row.entityId),
        }));

        router.patch(
            template.updateConditionsUrl,
            { conditions },
            {
                onFinish: () => setSaving(false),
                onSuccess: () => onClose(),
            },
        );
    }

    const ruleHasId = (ruleType: RuleType) =>
        RULE_TYPES.find((r) => r.value === ruleType)?.hasId ?? false;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-label={`Display conditions for ${template.name}`}
        >
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            Display Conditions
                        </h2>
                        <p className="text-sm text-gray-500">{template.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                    <p className="mb-4 text-sm text-gray-500">
                        A template with <strong>no conditions</strong> applies
                        site-wide. When conditions are set, the most specific matching
                        template wins. Exclude rules always override includes.
                    </p>

                    <div className="space-y-3">
                        {rows.map((row, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                            >
                                {/* Mode */}
                                <select
                                    value={row.mode}
                                    aria-label="Condition mode"
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            'mode',
                                            e.target.value as 'include' | 'exclude',
                                        )
                                    }
                                    className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="include">Include</option>
                                    <option value="exclude">Exclude</option>
                                </select>

                                {/* Rule type */}
                                <select
                                    value={row.ruleType}
                                    aria-label="Condition rule type"
                                    onChange={(e) =>
                                        updateRow(
                                            idx,
                                            'ruleType',
                                            e.target.value as RuleType,
                                        )
                                    }
                                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {RULE_TYPES.map((rt) => (
                                        <option key={rt.value} value={rt.value}>
                                            {rt.label}
                                        </option>
                                    ))}
                                </select>

                                {/* Entity ID (only when rule supports it) */}
                                {ruleHasId(row.ruleType) ? (
                                    <input
                                        type="number"
                                        min="1"
                                        value={row.entityId}
                                        aria-label="Entity ID (leave blank for any)"
                                        placeholder="ID (blank = any)"
                                        onChange={(e) =>
                                            updateRow(idx, 'entityId', e.target.value)
                                        }
                                        className="w-36 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <span className="w-36" />
                                )}

                                {/* Remove */}
                                <button
                                    type="button"
                                    onClick={() => removeRow(idx)}
                                    aria-label="Remove condition"
                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {rows.length === 0 && (
                            <p className="text-center text-sm text-gray-400">
                                No conditions — template applies site-wide.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={addRow}
                        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                        <Plus size={15} />
                        Add condition
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save conditions'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ThemeTemplatesIndex({ templates }: Props) {
    const [editingUlid, setEditingUlid] = useState<string | null>(null);

    const editingTemplate = templates.find((t) => t.ulid === editingUlid) ?? null;

    return (
        <AdminLayout title="Theme Templates">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Edit your theme layout templates in the visual page builder.
                        Use display conditions to control which template appears on each
                        page.
                    </p>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Conditions</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {templates.map((template) => (
                                <tr key={template.ulid} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <LayoutTemplate
                                                size={15}
                                                className="text-gray-400"
                                            />
                                            {template.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(template.type)}`}
                                        >
                                            {template.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                template.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            {template.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditingUlid(template.ulid)
                                            }
                                            className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800"
                                        >
                                            {template.conditions.length > 0
                                                ? `${template.conditions.length} rule${template.conditions.length !== 1 ? 's' : ''}`
                                                : 'Site-wide (no rules)'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={template.editUrl}
                                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit size={14} />
                                            Edit in Builder
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {templates.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No theme templates found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingTemplate !== null && (
                <ConditionsModal
                    template={editingTemplate}
                    onClose={() => setEditingUlid(null)}
                />
            )}
        </AdminLayout>
    );
}
