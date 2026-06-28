import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface Item { name: string; desc: string; price: string }

function Preview({ component }: WidgetPreviewProps) {
    const items = (component.settings.items ?? []) as Item[];
    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                    <div><div className="font-medium text-gray-900">{it.name}</div>{it.desc && <div className="text-xs text-gray-500">{it.desc}</div>}</div>
                    <div className="flex-1 border-b border-dotted border-gray-300" />
                    <div className="font-semibold text-gray-900">{it.price}</div>
                </div>
            ))}
        </div>
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
                <div key={i} className="space-y-1 rounded border border-gray-200 p-2">
                    <div className="flex gap-1">
                        <input value={it.name} onChange={(e) => update(i, 'name', e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="Name" />
                        <input value={it.price} onChange={(e) => update(i, 'price', e.target.value)} className="w-16 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="$" />
                        <button onClick={() => onChange({ ...component.settings, items: items.filter((_, idx) => idx !== i) })} className="text-xs text-red-400">✕</button>
                    </div>
                    <input value={it.desc} onChange={(e) => update(i, 'desc', e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" placeholder="Description" />
                </div>
            ))}
            <button onClick={() => onChange({ ...component.settings, items: [...items, { name: 'Item', desc: '', price: '$0' }] })} className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400">+ Add Item</button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'price-list', version: 1, category: 'content', label: 'Price List', icon: '≡$', hasChildren: false,
    defaultSettings: { items: [{ name: 'Espresso', desc: 'Rich and bold', price: '$3.50' }, { name: 'Cappuccino', desc: 'Creamy classic', price: '$4.50' }] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
