import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { text = '', author = '', color = '#2563eb' } = component.settings as Record<string, string>;
    return (
        <blockquote className="border-l-4 pl-4 italic" style={{ borderColor: color }}>
            <p className="text-lg text-gray-800">&quot;{text || 'A memorable quote goes here.'}&quot;</p>
            {author && <footer className="mt-2 text-sm font-medium text-gray-500">— {author}</footer>}
        </blockquote>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Quote</label><textarea value={s.text ?? ''} onChange={(e) => onChange({ ...s, text: e.target.value })} rows={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Author</label><input type="text" value={s.author ?? ''} onChange={(e) => onChange({ ...s, author: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Accent Color</label><input type="color" value={s.color ?? '#2563eb'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'blockquote', version: 1, category: 'content', label: 'Blockquote', icon: '❝', hasChildren: false,
    defaultSettings: { text: 'Design is not just what it looks like. Design is how it works.', author: 'Steve Jobs', color: '#2563eb' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
