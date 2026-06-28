import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

const STYLES: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
};

function Preview({ component }: WidgetPreviewProps) {
    const { variant = 'info', title = 'Heads up!', text = '' } = component.settings as Record<string, string>;
    return (
        <div className={`rounded-lg border px-4 py-3 ${STYLES[variant] ?? STYLES.info}`}>
            <div className="font-semibold text-sm">{title}</div>
            {text && <div className="mt-0.5 text-sm opacity-90">{text}</div>}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Type</label>
                <select value={s.variant ?? 'info'} onChange={(e) => onChange({ ...s, variant: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Danger</option>
                </select></div>
            <div><label className="block text-xs font-medium text-gray-600">Title</label><input type="text" value={s.title ?? ''} onChange={(e) => onChange({ ...s, title: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Text</label><textarea value={s.text ?? ''} onChange={(e) => onChange({ ...s, text: e.target.value })} rows={2} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'alert', version: 1, category: 'content', label: 'Alert', icon: '⚠', hasChildren: false,
    defaultSettings: { variant: 'info', title: 'Note', text: 'This is an alert message.' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
