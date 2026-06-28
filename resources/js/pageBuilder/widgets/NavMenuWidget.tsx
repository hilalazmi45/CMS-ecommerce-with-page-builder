import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface Link { label: string; url: string }

function Preview({ component }: WidgetPreviewProps) {
    const links = (component.settings.links ?? []) as Link[];
    const align = (component.settings.align as string) ?? 'left';
    return (
        <nav className={`flex flex-wrap gap-6 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {links.map((l, i) => <a key={i} href={l.url} onClick={(e) => e.preventDefault()} className="text-sm font-medium text-gray-700 hover:text-blue-600">{l.label}</a>)}
        </nav>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const links = (component.settings.links ?? []) as Link[];
    const update = (i: number, f: keyof Link, v: string) => onChange({ ...component.settings, links: links.map((l, idx) => idx === i ? { ...l, [f]: v } : l) });
    return (
        <div className="space-y-2 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Alignment</label><select value={(component.settings.align as string) ?? 'left'} onChange={(e) => onChange({ ...component.settings, align: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
            {links.map((l, i) => (
                <div key={i} className="flex gap-1">
                    <input value={l.label} onChange={(e) => update(i, 'label', e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="Label" />
                    <input value={l.url} onChange={(e) => update(i, 'url', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="/url" />
                    <button onClick={() => onChange({ ...component.settings, links: links.filter((_, idx) => idx !== i) })} className="text-xs text-red-400">✕</button>
                </div>
            ))}
            <button onClick={() => onChange({ ...component.settings, links: [...links, { label: 'Link', url: '#' }] })} className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400">+ Add Link</button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'nav-menu', version: 1, category: 'content', label: 'Nav Menu', icon: '☰', hasChildren: false,
    defaultSettings: { align: 'left', links: [{ label: 'Home', url: '/' }, { label: 'Shop', url: '/shop' }, { label: 'About', url: '/about' }, { label: 'Contact', url: '/contact' }] },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
