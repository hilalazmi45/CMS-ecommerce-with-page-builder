import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { height = '40px' } = component.settings as Record<string, string>;
    return <div style={{ height }} aria-hidden="true" />;
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    const { height = '40px' } = component.settings as Record<string, string>;
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded border border-dashed border-gray-300 ${isSelected ? 'border-blue-500 bg-blue-50' : ''}`} style={{ height }}>
            {isSelected && <span className="flex h-full items-center justify-center text-xs text-blue-400">Spacer: {height}</span>}
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="p-3">
            <label className="block text-xs font-medium text-gray-600">Height</label>
            <input type="text" value={s.height ?? '40px'} onChange={(e) => onChange({ ...s, height: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="40px" />
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'spacer',
    version: 1,
    category: 'basic',
    label: 'Spacer',
    icon: '↕',
    hasChildren: false,
    defaultSettings: { height: '40px' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
