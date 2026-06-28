import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { heading = 'Ready to Get Started?', text = '', buttonText = 'Start Now', buttonUrl = '#', background = '#1e40af', textColor = '#ffffff' } = component.settings as Record<string, string>;
    return (
        <div className="rounded-xl p-10 text-center" style={{ background, color: textColor }}>
            <h2 className="mb-3 text-3xl font-bold">{heading}</h2>
            {text && <p className="mb-6 text-lg opacity-90">{text}</p>}
            <a href={buttonUrl} onClick={(e) => e.preventDefault()} className="inline-block rounded-lg bg-white px-6 py-3 font-semibold transition hover:opacity-90" style={{ color: background }}>
                {buttonText}
            </a>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Heading</label>
                <input type="text" value={s.heading ?? ''} onChange={(e) => onChange({ ...s, heading: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Subtext</label>
                <input type="text" value={s.text ?? ''} onChange={(e) => onChange({ ...s, text: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Button Text</label>
                <input type="text" value={s.buttonText ?? 'Get Started'} onChange={(e) => onChange({ ...s, buttonText: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Button URL</label>
                <input type="text" value={s.buttonUrl ?? '#'} onChange={(e) => onChange({ ...s, buttonUrl: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-600">Background</label>
                    <input type="color" value={s.background ?? '#1e40af'} onChange={(e) => onChange({ ...s, background: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600">Text Color</label>
                    <input type="color" value={s.textColor ?? '#ffffff'} onChange={(e) => onChange({ ...s, textColor: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
                </div>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'call-to-action',
    version: 1,
    category: 'content',
    label: 'Call to Action',
    icon: '🎯',
    hasChildren: false,
    defaultSettings: { heading: 'Ready to Get Started?', text: 'Join thousands of satisfied customers today.', buttonText: 'Get Started Free', buttonUrl: '#', background: '#1e40af', textColor: '#ffffff' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
