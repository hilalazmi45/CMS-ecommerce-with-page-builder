import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface Tab { label: string; content: string; }

function Preview({ component }: WidgetPreviewProps) {
    const tabs = (component.settings.tabs ?? []) as Tab[];
    const [active, setActive] = useState(0);
    return (
        <div>
            <div className="flex border-b border-gray-200">
                {tabs.map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`px-4 py-2 text-sm font-medium ${active === i ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-4 text-sm text-gray-700">
                {tabs[active]?.content ?? ''}
            </div>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const tabs = (component.settings.tabs ?? []) as Tab[];

    function updateTab(i: number, field: keyof Tab, value: string) {
        const newTabs = tabs.map((t, idx) => idx === i ? { ...t, [field]: value } : t);
        onChange({ ...component.settings, tabs: newTabs });
    }

    return (
        <div className="space-y-3 p-3">
            {tabs.map((tab, i) => (
                <div key={i} className="space-y-1 rounded border border-gray-200 p-2">
                    <input type="text" value={tab.label} onChange={(e) => updateTab(i, 'label', e.target.value)} placeholder="Tab label" className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-medium" />
                    <textarea value={tab.content} onChange={(e) => updateTab(i, 'content', e.target.value)} placeholder="Tab content" rows={3} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                </div>
            ))}
            <button onClick={() => onChange({ ...component.settings, tabs: [...tabs, { label: 'New Tab', content: '' }] })} className="w-full rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-blue-400">
                + Add Tab
            </button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'tabs',
    version: 1,
    category: 'content',
    label: 'Tabs',
    icon: '⊟',
    hasChildren: false,
    defaultSettings: { tabs: [{ label: 'Tab 1', content: 'Content 1' }, { label: 'Tab 2', content: 'Content 2' }] },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
