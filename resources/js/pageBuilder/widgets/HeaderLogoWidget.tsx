import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const {
        imageUrl = '',
        width = '150',
        link = '/',
        altText = 'Senheng',
        logoText = 'SENHENG',
        textColor = '#e60012',
    } = component.settings as Record<string, string>;

    return (
        <div className="site-logo wd-header-logo">
            <a
                href={link}
                onClick={(e) => e.preventDefault()}
                className="wd-logo wd-main-logo flex items-center"
                rel="home"
                aria-label={altText}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={altText}
                        style={{ maxWidth: `${width}px`, width: '100%', height: 'auto' }}
                    />
                ) : (
                    <span
                        className="font-extrabold uppercase leading-none tracking-tight"
                        style={{ color: textColor, fontSize: '2rem', fontStyle: 'italic' }}
                    >
                        {logoText}
                    </span>
                )}
            </a>
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
                <label className="block text-xs font-medium text-gray-600">Logo Image URL</label>
                <input
                    type="text"
                    value={s.imageUrl ?? ''}
                    onChange={(e) => onChange({ ...s, imageUrl: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="https://..."
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alt Text / Site Name</label>
                <input
                    type="text"
                    value={s.altText ?? 'Senheng'}
                    onChange={(e) => onChange({ ...s, altText: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <p className="text-xs text-gray-400">Leave image URL empty to show the text logo below.</p>
            <div>
                <label className="block text-xs font-medium text-gray-600">Text Logo</label>
                <input
                    type="text"
                    value={s.logoText ?? 'SENHENG'}
                    onChange={(e) => onChange({ ...s, logoText: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Text Color</label>
                <input
                    type="text"
                    value={s.textColor ?? '#e60012'}
                    onChange={(e) => onChange({ ...s, textColor: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="#e60012"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Width (px)</label>
                <input
                    type="number"
                    value={s.width ?? '150'}
                    onChange={(e) => onChange({ ...s, width: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Link URL</label>
                <input
                    type="text"
                    value={s.link ?? '/'}
                    onChange={(e) => onChange({ ...s, link: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'header-logo',
    version: 1,
    category: 'layout',
    label: 'Header Logo',
    icon: '◈',
    hasChildren: false,
    defaultSettings: {
        imageUrl: '',
        width: '150',
        link: '/',
        altText: 'Senheng',
        logoText: 'SENHENG',
        textColor: '#e60012',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
