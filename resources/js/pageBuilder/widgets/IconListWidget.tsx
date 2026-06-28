import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface Item { icon: string; text: string }

function Preview({ component }: WidgetPreviewProps) {
    const items = (component.settings.items ?? []) as Item[];
    return (
        <ul className="space-y-2">
            {items.map((it, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700"><span className="text-blue-600">{it.icon}</span>{it.text}</li>
            ))}
        </ul>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const items = (component.settings.items ?? []) as Item[];
    const update = (i: number, f: keyof Item, v: string) => onChange({ ...component.settings, items: items.map((it, idx) => idx === i ? { ...it, [f]: v } : it) });
    return (
        <div className="space-y-2 p-3">
            {items.map((it, i) => (
                <div key={i} className="flex gap-1">
                    <input value={it.icon} onChange={(e) => update(i, 'icon', e.target.value)} className="w-10 rounded border border-gray-300 px-1 py-1 text-xs" />
                    <input value={it.text} onChange={(e) => update(i, 'text', e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
                    <button onClick={() => onChange({ ...component.settings, items: items.filter((_, idx) => idx !== i) })} className="text-xs text-red-400">✕</button>
                </div>
            ))}
            <button onClick={() => onChange({ ...component.settings, items: [...items, { icon: '✓', text: 'New item' }] })} className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400">+ Add Item</button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'icon-list', version: 1, category: 'content', label: 'Icon List', icon: '☑', hasChildren: false,
    defaultSettings: { items: [{ icon: '✓', text: 'First feature' }, { icon: '✓', text: 'Second feature' }] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
