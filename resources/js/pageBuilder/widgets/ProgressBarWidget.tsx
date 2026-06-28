import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { label = 'Skill', value = '80', color = '#2563eb' } = component.settings as Record<string, string>;
    const pct = Math.min(100, Math.max(0, parseInt(value) || 0));
    return (
        <div>
            <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{pct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
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
                <label className="block text-xs font-medium text-gray-600">Label</label>
                <input type="text" value={s.label ?? ''} onChange={(e) => onChange({ ...s, label: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Value (%)</label>
                <input type="number" min="0" max="100" value={s.value ?? '80'} onChange={(e) => onChange({ ...s, value: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Color</label>
                <input type="color" value={s.color ?? '#2563eb'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'progress-bar',
    version: 1,
    category: 'content',
    label: 'Progress Bar',
    icon: '▬',
    hasChildren: false,
    defaultSettings: { label: 'Design', value: '90', color: '#2563eb' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
