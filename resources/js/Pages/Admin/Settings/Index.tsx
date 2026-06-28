import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps, Setting } from '@/types';

interface Props extends PageProps {
    settings: Record<string, Setting[]>;
}

type SettingValue = string | number | boolean | null;
type FlatSetting = { group: string; key: string; value: SettingValue };

function flatten(settings: Record<string, Setting[]>): FlatSetting[] {
    return Object.values(settings).flat().map(({ group, key, value }) => ({
        group,
        key,
        value: (value as SettingValue) ?? null,
    }));
}

export default function SettingsIndex({ settings }: Props) {
    const groups = Object.keys(settings);
    const [activeGroup, setActiveGroup] = useState(groups[0] ?? '');
    const [values, setValues] = useState<FlatSetting[]>(flatten(settings));
    const [saving, setSaving] = useState(false);

    function getValue(group: string, key: string): SettingValue {
        return values.find((s) => s.group === group && s.key === key)?.value ?? '';
    }

    function setValue(group: string, key: string, value: SettingValue) {
        setValues((prev) =>
            prev.map((s) => (s.group === group && s.key === key ? { ...s, value } : s)),
        );
    }

    function save() {
        setSaving(true);
        router.patch(
            route('admin.settings.update'),
            { settings: values },
            {
                onFinish: () => setSaving(false),
                preserveScroll: true,
            },
        );
    }

    function renderInput(setting: Setting) {
        const val = getValue(setting.group, setting.key);

        if (setting.type === 'boolean') {
            return (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={`${setting.group}.${setting.key}`}
                        checked={Boolean(val)}
                        onChange={(e) => setValue(setting.group, setting.key, e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600"
                    />
                    <label htmlFor={`${setting.group}.${setting.key}`} className="text-sm text-gray-700">
                        {setting.key.replace(/_/g, ' ')}
                    </label>
                </div>
            );
        }

        if (setting.type === 'number') {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700 capitalize">
                        {setting.key.replace(/_/g, ' ')}
                    </label>
                    <input
                        type="number"
                        value={String(val)}
                        onChange={(e) => setValue(setting.group, setting.key, Number(e.target.value))}
                        className="mt-1 block w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
            );
        }

        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 capitalize">
                    {setting.key.replace(/_/g, ' ')}
                </label>
                <input
                    type="text"
                    value={String(val ?? '')}
                    onChange={(e) => setValue(setting.group, setting.key, e.target.value)}
                    className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <AdminLayout title="Settings">
                <p className="text-sm text-gray-500">No settings configured yet.</p>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Settings">
            <div className="max-w-3xl">
                {/* Group tabs */}
                <div className="mb-6 flex gap-1 border-b border-gray-200">
                    {groups.map((group) => (
                        <button
                            key={group}
                            onClick={() => setActiveGroup(group)}
                            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                                activeGroup === group
                                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {group}
                        </button>
                    ))}
                </div>

                {/* Active group fields */}
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="space-y-5">
                        {(settings[activeGroup] ?? []).map((setting) => (
                            <div key={`${setting.group}.${setting.key}`}>
                                {renderInput(setting)}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        onClick={save}
                        disabled={saving}
                        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
