import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const {
        text = 'Join PlusOne Now & Enjoy Exclusive Rewards',
        bgColor = '#0067b8',
        textColor = '#ffffff',
        link = '',
    } = component.settings as Record<string, string>;

    const inner = (
        <p className="text-sm font-medium text-center" style={{ color: textColor }}>
            {text}
        </p>
    );

    return (
        <div className="wd-header-top-bar w-full py-2 px-4" style={{ backgroundColor: bgColor }}>
            {link ? (
                <a href={link} onClick={(e) => e.preventDefault()} className="block w-full">
                    {inner}
                </a>
            ) : (
                inner
            )}
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
                <label className="block text-xs font-medium text-gray-600">Promo Text</label>
                <input
                    type="text"
                    value={s.text ?? 'Join PlusOne Now & Enjoy Exclusive Rewards'}
                    onChange={(e) => onChange({ ...s, text: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Link URL (optional)</label>
                <input
                    type="text"
                    value={s.link ?? ''}
                    onChange={(e) => onChange({ ...s, link: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="/plusone"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-600">Background</label>
                    <input
                        type="color"
                        value={s.bgColor ?? '#0067b8'}
                        onChange={(e) => onChange({ ...s, bgColor: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-gray-300 px-1"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600">Text Color</label>
                    <input
                        type="color"
                        value={s.textColor ?? '#ffffff'}
                        onChange={(e) => onChange({ ...s, textColor: e.target.value })}
                        className="mt-1 h-8 w-full rounded border border-gray-300 px-1"
                    />
                </div>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'header-top-bar',
    version: 1,
    category: 'layout',
    label: 'Header Top Bar',
    icon: '📢',
    hasChildren: false,
    defaultSettings: {
        text: 'Join PlusOne Now & Enjoy Exclusive Rewards',
        bgColor: '#0067b8',
        textColor: '#ffffff',
        link: '/plusone',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
