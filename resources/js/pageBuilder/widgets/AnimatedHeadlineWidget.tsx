import { useEffect, useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { before = 'We make', rotating = 'design,code,magic', after = 'happen', color = '#2563eb' } = component.settings as Record<string, string>;
    const words = rotating.split(',').map((w) => w.trim()).filter(Boolean);
    const [i, setI] = useState(0);
    useEffect(() => {
        if (words.length < 2) return;
        const id = setInterval(() => setI((p) => (p + 1) % words.length), 2000);
        return () => clearInterval(id);
    }, [words.length]);
    return (
        <h2 className="text-center text-3xl font-bold text-gray-900">
            {before} <span style={{ color }} className="transition-all">{words[i] ?? ''}</span> {after}
        </h2>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Before text</label><input type="text" value={s.before ?? ''} onChange={(e) => onChange({ ...s, before: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Rotating words (comma-separated)</label><input type="text" value={s.rotating ?? ''} onChange={(e) => onChange({ ...s, rotating: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">After text</label><input type="text" value={s.after ?? ''} onChange={(e) => onChange({ ...s, after: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Highlight Color</label><input type="color" value={s.color ?? '#2563eb'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" /></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'animated-headline', version: 1, category: 'content', label: 'Animated Headline', icon: '✨', hasChildren: false,
    defaultSettings: { before: 'We build', rotating: 'websites, stores, brands', after: 'that convert', color: '#2563eb' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
