import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { title = 'Toggle title', content = 'Hidden content.' } = component.settings as Record<string, string>;
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-lg border border-gray-200">
            <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900">
                {title}<span>{open ? '−' : '+'}</span>
            </button>
            {open && <div className="px-4 pb-3 text-sm text-gray-600">{content}</div>}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Title</label><input type="text" value={s.title ?? ''} onChange={(e) => onChange({ ...s, title: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Content</label><textarea value={s.content ?? ''} onChange={(e) => onChange({ ...s, content: e.target.value })} rows={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'toggle', version: 1, category: 'content', label: 'Toggle', icon: '⊕', hasChildren: false,
    defaultSettings: { title: 'Click to expand', content: 'Hidden content revealed on click.' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
