import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { icon = '⭐', title = 'Feature Title', text = 'Describe your feature here.', iconColor = '#2563eb', align = 'center' } = component.settings as Record<string, string>;
    const alignClass = align === 'center' ? 'text-center items-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start';
    return (
        <div className={`flex flex-col gap-3 ${alignClass}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl" style={{ background: `${iconColor}1a` }}>
                <span style={{ color: iconColor }}>{icon}</span>
            </div>
            <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-600">{text}</p>
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
                <label className="block text-xs font-medium text-gray-600">Icon (emoji or text)</label>
                <input type="text" value={s.icon ?? '⭐'} onChange={(e) => onChange({ ...s, icon: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Title</label>
                <input type="text" value={s.title ?? ''} onChange={(e) => onChange({ ...s, title: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Description</label>
                <textarea value={s.text ?? ''} onChange={(e) => onChange({ ...s, text: e.target.value })} rows={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Icon Color</label>
                <input type="color" value={s.iconColor ?? '#2563eb'} onChange={(e) => onChange({ ...s, iconColor: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alignment</label>
                <select value={s.align ?? 'center'} onChange={(e) => onChange({ ...s, align: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'icon-box',
    version: 1,
    category: 'content',
    label: 'Icon Box',
    icon: '⬡',
    hasChildren: false,
    defaultSettings: { icon: '🚀', title: 'Amazing Feature', text: 'Describe what makes this feature special.', iconColor: '#2563eb', align: 'center' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
