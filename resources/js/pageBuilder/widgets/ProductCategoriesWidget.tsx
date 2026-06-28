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
    const { columns = '6', showCount = 'true' } = component.settings as Record<string, string>;
    const { categories } = useStorefront();
    const cols = parseInt(columns) || 6;
    const show = showCount === 'true';
    const { className, css } = responsiveGrid(component.id, cols, '16px', { tabletMax: 4, mobileMax: 3 });

    if (categories.length > 0) {
        return (
            <>
                <style>{css}</style>
                <div className={className}>
                {categories.map((cat) => (
                    <a
                        key={cat.id}
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        className="group flex flex-col items-center gap-2 text-center"
                    >
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-gray-100 bg-gray-50 transition-colors group-hover:border-blue-400">
                            {cat.image ? (
                                <img
                                    src={cat.image.url}
                                    alt={cat.image.alt ?? cat.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl">📦</span>
                            )}
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 leading-tight">
                            {cat.name}
                        </span>
                    </a>
                ))}
                </div>
            </>
        );
    }

    // Placeholder
    const placeholders = Array.from({ length: cols });
    return (
        <>
            <style>{css}</style>
            <div className={className}>
            {placeholders.map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 rounded-full bg-gray-100" />
                    <div className="h-3 w-12 rounded bg-gray-200" />
                    {show && <div className="h-2.5 w-8 rounded bg-gray-100" />}
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
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="showCount"
                    checked={(s.showCount ?? 'true') === 'true'}
                    onChange={(e) => onChange({ ...s, showCount: e.target.checked ? 'true' : 'false' })}
                    className="rounded border-gray-300"
                />
                <label htmlFor="showCount" className="text-xs font-medium text-gray-600">
                    Show product count
                </label>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-categories',
    version: 1,
    category: 'commerce',
    label: 'Product Categories',
    icon: '📂',
    hasChildren: false,
    defaultSettings: { columns: '6', showCount: 'true' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
