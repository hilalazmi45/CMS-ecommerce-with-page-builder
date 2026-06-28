import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { frontTitle = 'Front', frontText = '', backTitle = 'Back', backText = '', frontBg = '#2563eb', backBg = '#1e40af' } = component.settings as Record<string, string>;
    const [flipped, setFlipped] = useState(false);
    const side = flipped ? { title: backTitle, text: backText, bg: backBg } : { title: frontTitle, text: frontText, bg: frontBg };
    return (
        <div onMouseEnter={() => setFlipped(true)} onMouseLeave={() => setFlipped(false)} className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl p-6 text-center text-white transition-all" style={{ background: side.bg }}>
            <h3 className="text-xl font-bold">{side.title}</h3>
            {side.text && <p className="mt-2 text-sm opacity-90">{side.text}</p>}
            <span className="mt-3 text-xs opacity-60">{flipped ? '' : 'Hover to flip'}</span>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <p className="text-xs font-semibold text-gray-500">Front</p>
            <input type="text" value={s.frontTitle ?? ''} onChange={(e) => onChange({ ...s, frontTitle: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Front title" />
            <textarea value={s.frontText ?? ''} onChange={(e) => onChange({ ...s, frontText: e.target.value })} rows={2} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Front text" />
            <input type="color" value={s.frontBg ?? '#2563eb'} onChange={(e) => onChange({ ...s, frontBg: e.target.value })} className="h-8 w-full rounded border border-gray-300 px-1" />
            <p className="text-xs font-semibold text-gray-500">Back</p>
            <input type="text" value={s.backTitle ?? ''} onChange={(e) => onChange({ ...s, backTitle: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Back title" />
            <textarea value={s.backText ?? ''} onChange={(e) => onChange({ ...s, backText: e.target.value })} rows={2} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Back text" />
            <input type="color" value={s.backBg ?? '#1e40af'} onChange={(e) => onChange({ ...s, backBg: e.target.value })} className="h-8 w-full rounded border border-gray-300 px-1" />
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'flip-box', version: 1, category: 'content', label: 'Flip Box', icon: '⇋', hasChildren: false,
    defaultSettings: { frontTitle: 'Our Mission', frontText: 'Hover to learn more', backTitle: 'Deliver Quality', backText: 'We build lasting products.', frontBg: '#2563eb', backBg: '#1e40af' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
