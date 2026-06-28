import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

const NETWORKS: Record<string, { label: string; color: string }> = {
    facebook: { label: 'Facebook', color: '#1877f2' },
    twitter: { label: 'X', color: '#000000' },
    linkedin: { label: 'LinkedIn', color: '#0a66c2' },
    whatsapp: { label: 'WhatsApp', color: '#25d366' },
    email: { label: 'Email', color: '#6b7280' },
};

function Preview({ component }: WidgetPreviewProps) {
    const selected = (component.settings.networks ?? []) as string[];
    return (
        <div className="flex flex-wrap gap-2">
            {selected.map((n) => (
                <span key={n} className="rounded-lg px-3 py-1.5 text-sm font-medium text-white" style={{ background: NETWORKS[n]?.color ?? '#888' }}>{NETWORKS[n]?.label ?? n}</span>
            ))}
            {selected.length === 0 && <span className="text-sm text-gray-400">Pick networks →</span>}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const selected = (component.settings.networks ?? []) as string[];
    const toggle = (n: string) => onChange({ ...component.settings, networks: selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n] });
    return (
        <div className="space-y-2 p-3">
            <label className="block text-xs font-medium text-gray-600">Networks</label>
            {Object.entries(NETWORKS).map(([key, n]) => (
                <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />{n.label}</label>
            ))}
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'share-buttons', version: 1, category: 'content', label: 'Share Buttons', icon: '↗', hasChildren: false,
    defaultSettings: { networks: ['facebook', 'twitter', 'linkedin'] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
