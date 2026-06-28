import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { query = 'Kuala Lumpur', height = '300px' } = component.settings as Record<string, string>;
    const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    return <iframe title="Map" src={src} style={{ width: '100%', height, border: 0, borderRadius: 8 }} loading="lazy" />;
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Location / Address</label><input type="text" value={s.query ?? ''} onChange={(e) => onChange({ ...s, query: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Height</label><input type="text" value={s.height ?? '300px'} onChange={(e) => onChange({ ...s, height: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'google-maps', version: 1, category: 'content', label: 'Google Maps', icon: '📍', hasChildren: false,
    defaultSettings: { query: 'Kuala Lumpur, Malaysia', height: '300px' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
