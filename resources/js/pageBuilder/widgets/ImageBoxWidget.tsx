import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { src = '', title = 'Title', text = '', align = 'center' } = component.settings as Record<string, string>;
    return (
        <div className={`text-${align}`}>
            {src ? <img src={src} alt={title} className="mb-3 inline-block max-w-full rounded-lg" /> : <div className="mb-3 flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-300">Image</div>}
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {text && <p className="mt-1 text-sm text-gray-600">{text}</p>}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Image URL</label><input type="text" value={s.src ?? ''} onChange={(e) => onChange({ ...s, src: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Title</label><input type="text" value={s.title ?? ''} onChange={(e) => onChange({ ...s, title: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Text</label><textarea value={s.text ?? ''} onChange={(e) => onChange({ ...s, text: e.target.value })} rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Alignment</label><select value={s.align ?? 'center'} onChange={(e) => onChange({ ...s, align: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'image-box', version: 1, category: 'content', label: 'Image Box', icon: '🖼', hasChildren: false,
    defaultSettings: { src: '', title: 'Feature Title', text: 'Supporting description text.', align: 'center' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
