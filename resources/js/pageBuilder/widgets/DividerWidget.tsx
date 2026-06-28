import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { style = 'solid', color = '#e5e7eb', width = '100%', thickness = '1px' } = component.settings as Record<string, string>;
    return <hr style={{ borderStyle: style, borderColor: color, borderTopWidth: thickness, width }} />;
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Style</label>
                <select value={s.style ?? 'solid'} onChange={(e) => onChange({ ...s, style: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Color</label>
                <input type="color" value={s.color ?? '#e5e7eb'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Thickness</label>
                <input type="text" value={s.thickness ?? '1px'} onChange={(e) => onChange({ ...s, thickness: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'divider',
    version: 1,
    category: 'basic',
    label: 'Divider',
    icon: '—',
    hasChildren: false,
    defaultSettings: { style: 'solid', color: '#e5e7eb', thickness: '1px', width: '100%' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
