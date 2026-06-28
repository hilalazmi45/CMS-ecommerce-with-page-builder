import type { ReactNode } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

// A small set of inline-SVG icons usable in the header tools row.
const ICONS: Record<string, ReactNode> = {
    location: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    ),
    help: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 1.787-2 3.272-2 1.953 0 3.5 1.343 3.5 3 0 1.4-1.105 2.4-2.5 2.83V14M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    ),
    phone: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h2.6a1 1 0 0 1 .97.757l.9 3.6a1 1 0 0 1-.27.95l-1.6 1.6a14 14 0 0 0 6 6l1.6-1.6a1 1 0 0 1 .95-.27l3.6.9a1 1 0 0 1 .757.97V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5z" />
    ),
    info: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    ),
};

function Preview({ component }: WidgetPreviewProps) {
    const {
        icon = 'location',
        label = 'Outlets',
        url = '#',
    } = component.settings as Record<string, string>;

    return (
        <a
            href={url}
            onClick={(e) => e.preventDefault()}
            className="wd-tools-element flex items-center gap-1.5 whitespace-nowrap text-gray-700 transition-colors hover:text-[#e60012]"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {ICONS[icon] ?? ICONS.location}
            </svg>
            <span className="hidden text-sm font-medium md:block">{label}</span>
        </a>
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
                <label className="block text-xs font-medium text-gray-600">Icon</label>
                <select
                    value={s.icon ?? 'location'}
                    onChange={(e) => onChange({ ...s, icon: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    {Object.keys(ICONS).map((k) => (
                        <option key={k} value={k}>{k}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Label</label>
                <input
                    type="text"
                    value={s.label ?? 'Outlets'}
                    onChange={(e) => onChange({ ...s, label: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Link URL</label>
                <input
                    type="text"
                    value={s.url ?? '#'}
                    onChange={(e) => onChange({ ...s, url: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'header-icon-link',
    version: 1,
    category: 'layout',
    label: 'Header Icon Link',
    icon: '📍',
    hasChildren: false,
    defaultSettings: {
        icon: 'location',
        label: 'Outlets',
        url: '#',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
