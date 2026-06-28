import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface AccordionItem { title: string; content: string; }

function Preview({ component }: WidgetPreviewProps) {
    const items = (component.settings.items ?? []) as AccordionItem[];
    const [open, setOpen] = useState<number | null>(0);
    return (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {items.map((item, i) => (
                <div key={i}>
                    <button
                        onClick={() => setOpen(open === i ? null : i)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900"
                    >
                        {item.title}
                        <span>{open === i ? '▲' : '▼'}</span>
                    </button>
                    {open === i && <div className="px-4 pb-3 text-sm text-gray-600">{item.content}</div>}
                </div>
            ))}
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
    const items = (component.settings.items ?? []) as AccordionItem[];

    function updateItem(i: number, field: keyof AccordionItem, value: string) {
        const newItems = items.map((item, idx) => idx === i ? { ...item, [field]: value } : item);
        onChange({ ...component.settings, items: newItems });
    }

    function addItem() {
        onChange({ ...component.settings, items: [...items, { title: 'New Question', content: 'Answer here...' }] });
    }

    function removeItem(i: number) {
        onChange({ ...component.settings, items: items.filter((_, idx) => idx !== i) });
    }

    return (
        <div className="space-y-3 p-3">
            {items.map((item, i) => (
                <div key={i} className="space-y-1 rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Item {i + 1}</span>
                        <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                    </div>
                    <input type="text" value={item.title} onChange={(e) => updateItem(i, 'title', e.target.value)} placeholder="Question" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                    <textarea value={item.content} onChange={(e) => updateItem(i, 'content', e.target.value)} placeholder="Answer" rows={2} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
                </div>
            ))}
            <button onClick={addItem} className="w-full rounded border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500">
                + Add Item
            </button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'accordion',
    version: 1,
    category: 'content',
    label: 'Accordion',
    icon: '≡',
    hasChildren: false,
    defaultSettings: { items: [{ title: 'Question 1', content: 'Answer 1' }, { title: 'Question 2', content: 'Answer 2' }] },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
