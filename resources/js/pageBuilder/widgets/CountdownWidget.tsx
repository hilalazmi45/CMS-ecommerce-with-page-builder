import { useEffect, useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function useCountdown(target: string) {
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        const update = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now()));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [target]);

    const s = Math.floor(diff / 1000);
    return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

function Preview({ component }: WidgetPreviewProps) {
    const { targetDate = '', label = 'Sale ends in', color = '#dc2626' } = component.settings as Record<string, string>;
    const { days, hours, minutes, seconds } = useCountdown(targetDate || new Date(Date.now() + 86400000).toISOString());

    return (
        <div className="text-center">
            {label && <p className="mb-3 text-sm text-gray-600">{label}</p>}
            <div className="flex justify-center gap-4">
                {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Sec' }].map(({ v, l }) => (
                    <div key={l} className="text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-white" style={{ background: color }}>
                            {String(v).padStart(2, '0')}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">{l}</div>
                    </div>
                ))}
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
                <label className="block text-xs font-medium text-gray-600">Target Date & Time</label>
                <input type="datetime-local" value={s.targetDate ?? ''} onChange={(e) => onChange({ ...s, targetDate: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Label</label>
                <input type="text" value={s.label ?? ''} onChange={(e) => onChange({ ...s, label: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Color</label>
                <input type="color" value={s.color ?? '#dc2626'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'countdown',
    version: 1,
    category: 'content',
    label: 'Countdown',
    icon: '⏱',
    hasChildren: false,
    defaultSettings: { targetDate: '', label: 'Offer ends in', color: '#dc2626' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
