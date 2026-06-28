import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function AppleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
    );
}

function AndroidIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5S11 23.33 11 22.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C7.01 3.07 6 4.61 6 6.35v.29h12v-.29c0-1.74-1.01-3.28-2.47-4.19z" />
        </svg>
    );
}

function Preview({ component }: WidgetPreviewProps) {
    const {
        iosUrl = '#',
        androidUrl = '#',
        heading = 'Download Our App',
    } = component.settings as Record<string, string>;

    return (
        <div className="wd-app-download">
            {heading && (
                <p className="mb-3 text-sm font-semibold text-gray-700">{heading}</p>
            )}
            <div className="flex flex-wrap gap-2">
                <a
                    href={iosUrl}
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                >
                    <AppleIcon />
                    <div className="text-left">
                        <div className="text-xs text-gray-300">Download on the</div>
                        <div className="text-sm font-semibold">App Store</div>
                    </div>
                </a>
                <a
                    href={androidUrl}
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                >
                    <AndroidIcon />
                    <div className="text-left">
                        <div className="text-xs text-gray-300">Get it on</div>
                        <div className="text-sm font-semibold">Google Play</div>
                    </div>
                </a>
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
                <label className="block text-xs font-medium text-gray-600">Heading (optional)</label>
                <input
                    type="text"
                    value={s.heading ?? 'Download Our App'}
                    onChange={(e) => onChange({ ...s, heading: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">iOS App Store URL</label>
                <input
                    type="text"
                    value={s.iosUrl ?? '#'}
                    onChange={(e) => onChange({ ...s, iosUrl: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="https://apps.apple.com/..."
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Google Play URL</label>
                <input
                    type="text"
                    value={s.androidUrl ?? '#'}
                    onChange={(e) => onChange({ ...s, androidUrl: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="https://play.google.com/..."
                />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'app-download',
    version: 1,
    category: 'layout',
    label: 'App Download',
    icon: '↓',
    hasChildren: false,
    defaultSettings: {
        heading: 'Download Our App',
        iosUrl: '#',
        androidUrl: '#',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
