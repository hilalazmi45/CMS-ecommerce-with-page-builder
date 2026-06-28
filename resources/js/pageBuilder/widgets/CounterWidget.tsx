import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { value = '100', suffix = '+', label = 'Happy Customers', color = '#2563eb' } = component.settings as Record<string, string>;
    return (
        <div className="text-center">
            <div className="text-5xl font-bold" style={{ color }}>{value}{suffix}</div>
            <div className="mt-2 text-sm text-gray-600">{label}</div>
        </div>
    );
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
                <label className="block text-xs font-medium text-gray-600">Value</label>
                <input type="text" value={s.value ?? '100'} onChange={(e) => onChange({ ...s, value: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Suffix</label>
                <input type="text" value={s.suffix ?? '+'} onChange={(e) => onChange({ ...s, suffix: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="+ or K+" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Label</label>
                <input type="text" value={s.label ?? ''} onChange={(e) => onChange({ ...s, label: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Color</label>
                <input type="color" value={s.color ?? '#2563eb'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'counter',
    version: 1,
    category: 'content',
    label: 'Counter',
    icon: '123',
    hasChildren: false,
    defaultSettings: { value: '500', suffix: '+', label: 'Happy Customers', color: '#2563eb' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
