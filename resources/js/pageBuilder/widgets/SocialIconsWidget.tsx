import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface SocialLink { platform: string; url: string; }

const PLATFORM_COLORS: Record<string, string> = {
    facebook: '#1877f2', instagram: '#e4405f', twitter: '#1da1f2',
    linkedin: '#0a66c2', youtube: '#ff0000', tiktok: '#000000',
    whatsapp: '#25d366', telegram: '#2ca5e0',
};

function Preview({ component }: WidgetPreviewProps) {
    const links = (component.settings.links ?? []) as SocialLink[];
    const size = (component.settings.size as string) ?? '32px';
    const align = (component.settings.align as string) ?? 'left';
    return (
        <div className={`flex gap-3 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {links.map((link, i) => (
                <a
                    key={i}
                    href={link.url || '#'}
                    onClick={(e) => e.preventDefault()}
                    style={{ width: size, height: size, background: PLATFORM_COLORS[link.platform] ?? '#888', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }}
                >
                    {link.platform.charAt(0).toUpperCase()}
                </a>
            ))}
            {links.length === 0 && <span className="text-sm text-gray-400">No links added</span>}
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
    const links = (component.settings.links ?? []) as SocialLink[];
    const align = (component.settings.align as string) ?? 'left';

    function updateLink(i: number, field: keyof SocialLink, value: string) {
        const newLinks = links.map((l, idx) => idx === i ? { ...l, [field]: value } : l);
        onChange({ ...component.settings, links: newLinks });
    }

    function addLink() {
        onChange({ ...component.settings, links: [...links, { platform: 'facebook', url: '' }] });
    }

    function removeLink(i: number) {
        onChange({ ...component.settings, links: links.filter((_, idx) => idx !== i) });
    }

    return (
        <div className="space-y-3 p-3">
            {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                    <select value={link.platform} onChange={(e) => updateLink(i, 'platform', e.target.value)} className="rounded border border-gray-300 px-1 py-1 text-xs">
                        {Object.keys(PLATFORM_COLORS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="text" value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" placeholder="https://..." />
                    <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
            ))}
            <button onClick={addLink} className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500">
                + Add Link
            </button>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alignment</label>
                <select value={align} onChange={(e) => onChange({ ...component.settings, align: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'social-icons',
    version: 1,
    category: 'basic',
    label: 'Social Icons',
    icon: '↗',
    hasChildren: false,
    defaultSettings: { links: [{ platform: 'facebook', url: '' }], size: '36px', align: 'left' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
