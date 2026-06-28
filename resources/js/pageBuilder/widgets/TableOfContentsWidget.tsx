import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface Entry { label: string; anchor: string }

function Preview({ component }: WidgetPreviewProps) {
    const { title = 'Table of Contents' } = component.settings as Record<string, string>;
    const entries = (component.settings.entries ?? []) as Entry[];
    return (
        <nav className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-800">{title}</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-blue-600">
                {entries.map((e, i) => <li key={i}><a href={`#${e.anchor}`} onClick={(ev) => ev.preventDefault()} className="hover:underline">{e.label}</a></li>)}
            </ol>
        </nav>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const entries = (component.settings.entries ?? []) as Entry[];
    const update = (i: number, f: keyof Entry, v: string) => onChange({ ...component.settings, entries: entries.map((e, idx) => idx === i ? { ...e, [f]: v } : e) });
    return (
        <div className="space-y-2 p-3">
            <input type="text" value={(component.settings.title as string) ?? ''} onChange={(e) => onChange({ ...component.settings, title: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Title" />
            {entries.map((e, i) => (
                <div key={i} className="flex gap-1">
                    <input value={e.label} onChange={(ev) => update(i, 'label', ev.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="Label" />
                    <input value={e.anchor} onChange={(ev) => update(i, 'anchor', ev.target.value)} className="w-20 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="anchor" />
                    <button onClick={() => onChange({ ...component.settings, entries: entries.filter((_, idx) => idx !== i) })} className="text-xs text-red-400">✕</button>
                </div>
            ))}
            <button onClick={() => onChange({ ...component.settings, entries: [...entries, { label: 'Section', anchor: 'section' }] })} className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400">+ Add Entry</button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'table-of-contents', version: 1, category: 'content', label: 'Table of Contents', icon: '☰', hasChildren: false,
    defaultSettings: { title: 'On this page', entries: [{ label: 'Introduction', anchor: 'intro' }, { label: 'Details', anchor: 'details' }] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
