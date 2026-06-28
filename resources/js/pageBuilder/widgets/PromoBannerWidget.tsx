import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const {
        imageUrl = '',
        title = 'Exclusive Deals Just for You',
        subtitle = 'Shop the latest electronics at unbeatable prices.',
        buttonText = 'Shop Now',
        buttonUrl = '#',
        textPosition = 'left',
    } = component.settings as Record<string, string>;

    const posClass =
        textPosition === 'center'
            ? 'items-center text-center'
            : textPosition === 'right'
            ? 'items-end text-right'
            : 'items-start text-left';

    return (
        <div
            className="relative flex min-h-48 w-full overflow-hidden rounded-xl"
            style={{ background: imageUrl ? undefined : 'linear-gradient(135deg,#1d4ed8,#2563eb)' }}
        >
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Content */}
            <div className={`relative z-10 flex flex-1 flex-col justify-center gap-3 p-8 ${posClass}`}>
                {title && (
                    <h2 className="text-2xl font-extrabold text-white drop-shadow">{title}</h2>
                )}
                {subtitle && (
                    <p className="max-w-md text-sm text-white/90 drop-shadow">{subtitle}</p>
                )}
                {buttonText && (
                    <a
                        href={buttonUrl}
                        onClick={(e) => e.preventDefault()}
                        className="mt-1 inline-block w-fit rounded-lg bg-white px-5 py-2 text-sm font-semibold text-blue-700 shadow transition-colors hover:bg-blue-50"
                    >
                        {buttonText}
                    </a>
                )}
            </div>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange, onStyleChange: _onStyleChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            {[
                { key: 'imageUrl', label: 'Background Image URL', placeholder: 'https://...' },
                { key: 'title', label: 'Title', placeholder: 'Exclusive Deals' },
                { key: 'subtitle', label: 'Subtitle', placeholder: 'Shop the latest...' },
                { key: 'buttonText', label: 'Button Text', placeholder: 'Shop Now' },
                { key: 'buttonUrl', label: 'Button URL', placeholder: '/shop' },
            ].map(({ key, label, placeholder }) => (
                <div key={key}>
                    <label className="block text-xs font-medium text-gray-600">{label}</label>
                    <input
                        type="text"
                        value={(s[key] as string) ?? ''}
                        onChange={(e) => onChange({ ...s, [key]: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        placeholder={placeholder}
                    />
                </div>
            ))}
            <div>
                <label className="block text-xs font-medium text-gray-600">Text Position</label>
                <select
                    value={s.textPosition ?? 'left'}
                    onChange={(e) => onChange({ ...s, textPosition: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'promo-banner',
    version: 1,
    category: 'commerce',
    label: 'Promo Banner',
    icon: '🎯',
    hasChildren: false,
    defaultSettings: {
        imageUrl: '',
        title: 'Exclusive Deals Just for You',
        subtitle: 'Shop the latest electronics at unbeatable prices.',
        buttonText: 'Shop Now',
        buttonUrl: '/shop',
        textPosition: 'left',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
