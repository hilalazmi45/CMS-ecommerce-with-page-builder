import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const images = (component.settings.images ?? []) as string[];
    const columns = (component.settings.columns as string) ?? '3';
    return (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {images.length === 0 && <div className="col-span-full flex h-24 items-center justify-center rounded border-2 border-dashed border-gray-200 text-sm text-gray-300">Add image URLs</div>}
            {images.map((src, i) => <img key={i} src={src} alt="" className="aspect-square w-full rounded object-cover" />)}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const images = (component.settings.images ?? []) as string[];
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Columns</label><select value={(component.settings.columns as string) ?? '3'} onChange={(e) => onChange({ ...component.settings, columns: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
            <div><label className="block text-xs font-medium text-gray-600">Image URLs (one per line)</label>
                <textarea value={images.join('\n')} onChange={(e) => onChange({ ...component.settings, images: e.target.value.split('\n').filter(Boolean) })} rows={5} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs" placeholder="https://...&#10;https://..." /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'image-gallery', version: 1, category: 'content', label: 'Gallery', icon: '▦', hasChildren: false,
    defaultSettings: { images: [], columns: '3' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
