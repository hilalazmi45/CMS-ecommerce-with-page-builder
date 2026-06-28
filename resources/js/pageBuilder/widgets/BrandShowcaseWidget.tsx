import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';
import { responsiveGrid } from '../render/gridStyle';

function Preview({ component }: WidgetPreviewProps) {
    const { columns = '6' } = component.settings as Record<string, string>;
    const { brands } = useStorefront();
    const cols = parseInt(columns) || 6;
    const { className, css } = responsiveGrid(component.id, cols, '16px', { tabletMax: 4, mobileMax: 3 });

    if (brands.length > 0) {
        return (
            <>
                <style>{css}</style>
                <div className={className}>
                {brands.map((brand) => (
                    <a
                        key={brand.id}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="group flex items-center justify-center rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                        title={brand.name}
                    >
                        {brand.logo ? (
                            <img
                                src={brand.logo.url}
                                alt={brand.logo.alt ?? brand.name}
                                className="max-h-10 w-auto object-contain grayscale transition-all group-hover:grayscale-0"
                            />
                        ) : (
                            <span className="text-sm font-semibold text-gray-500 group-hover:text-blue-600">
                                {brand.name}
                            </span>
                        )}
                    </a>
                ))}
                </div>
            </>
        );
    }

    // Placeholder
    return (
        <>
            <style>{css}</style>
            <div className={className}>
            {Array.from({ length: cols }).map((_, i) => (
                <div
                    key={i}
                    className="flex h-16 items-center justify-center rounded-lg border border-gray-100 bg-gray-50"
                >
                    <div className="h-5 w-16 rounded bg-gray-200" />
                </div>
            ))}
            </div>
        </>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange, onStyleChange: _onStyleChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Columns</label>
                <select
                    value={s.columns ?? '6'}
                    onChange={(e) => onChange({ ...s, columns: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    {['3', '4', '5', '6', '8'].map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'brand-showcase',
    version: 1,
    category: 'commerce',
    label: 'Brand Showcase',
    icon: '🏷️',
    hasChildren: false,
    defaultSettings: { columns: '6' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
