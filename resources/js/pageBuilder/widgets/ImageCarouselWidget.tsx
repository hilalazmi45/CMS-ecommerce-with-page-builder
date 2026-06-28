import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const images = (component.settings.images ?? []) as string[];
    const [i, setI] = useState(0);
    if (images.length === 0) return <div className="flex h-40 items-center justify-center rounded border-2 border-dashed border-gray-200 text-sm text-gray-300">Add image URLs</div>;
    return (
        <div className="relative">
            <img src={images[i]} alt="" className="h-56 w-full rounded-lg object-cover" />
            <button onClick={() => setI((i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow">‹</button>
            <button onClick={() => setI((i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-1 text-sm shadow">›</button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {images.map((_, idx) => <span key={idx} className={`h-1.5 w-1.5 rounded-full ${idx === i ? 'bg-white' : 'bg-white/50'}`} />)}
            </div>
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
            <label className="block text-xs font-medium text-gray-600">Image URLs (one per line)</label>
            <textarea value={images.join('\n')} onChange={(e) => onChange({ ...component.settings, images: e.target.value.split('\n').filter(Boolean) })} rows={6} className="w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'image-carousel', version: 1, category: 'content', label: 'Carousel', icon: '⇄', hasChildren: false,
    defaultSettings: { images: [] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
