import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface FooterLink { label: string; url: string }

function Preview({ component }: WidgetPreviewProps) {
    const {
        heading = 'Quick Links',
    } = component.settings as Record<string, string>;
    const links = (component.settings.links ?? []) as FooterLink[];

    return (
        <div className="wd-footer-column">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
                {heading}
            </h4>
            <ul className="space-y-2">
                {links.map((link, i) => (
                    <li key={i}>
                        <a
                            href={link.url}
                            onClick={(e) => e.preventDefault()}
                            className="text-sm text-gray-600 transition-colors hover:text-blue-600"
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
                {links.length === 0 && (
                    <li><span className="text-xs text-gray-400">No links added</span></li>
                )}
            </ul>
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
    const s = component.settings;
    const heading = (s.heading as string) ?? 'Quick Links';
    const links = (s.links ?? []) as FooterLink[];

    function updateLink(i: number, field: keyof FooterLink, value: string) {
        onChange({ ...s, links: links.map((l, idx) => idx === i ? { ...l, [field]: value } : l) });
    }

    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Column Heading</label>
                <input
                    type="text"
                    value={heading}
                    onChange={(e) => onChange({ ...s, heading: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            {links.map((link, i) => (
                <div key={i} className="flex gap-1">
                    <input
                        value={link.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                        placeholder="Label"
                    />
                    <input
                        value={link.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                        placeholder="/url"
                    />
                    <button
                        onClick={() => onChange({ ...s, links: links.filter((_, idx) => idx !== i) })}
                        className="text-xs text-red-400 hover:text-red-600"
                    >
                        ✕
                    </button>
                </div>
            ))}
            <button
                onClick={() => onChange({ ...s, links: [...links, { label: 'Link', url: '#' }] })}
                className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400"
            >
                + Add Link
            </button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'footer-column',
    version: 1,
    category: 'layout',
    label: 'Footer Column',
    icon: '≡',
    hasChildren: false,
    defaultSettings: {
        heading: 'Quick Links',
        links: [
            { label: 'About Senheng', url: '/about' },
            { label: 'Careers', url: '/careers' },
            { label: 'Store Locator', url: '/stores' },
            { label: 'Contact Us', url: '/contact' },
            { label: 'PlusOne Membership', url: '/plusone' },
        ],
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
