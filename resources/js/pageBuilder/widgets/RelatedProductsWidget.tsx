import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';
import { responsiveGrid } from '../render/gridStyle';
import { ProductCard } from './ProductCardWidget';

function Preview({ component }: WidgetPreviewProps) {
    const { columns = '4', limit = '4' } = component.settings as Record<string, string>;
    const { products, currentProduct } = useStorefront();
    const cols = parseInt(columns) || 4;
    const count = Math.min(parseInt(limit) || 4, 12);
    const { className, css } = responsiveGrid(component.id, cols, '16px', { tabletMax: 3, mobileMax: 2 });

    const related = currentProduct
        ? products.filter((p) => p.id !== currentProduct.id).slice(0, count)
        : products.slice(0, count);

    if (related.length > 0) {
        return (
            <div>
                <h3 className="mb-4 text-lg font-bold text-gray-800">Related Products</h3>
                <style>{css}</style>
                <div className={className}>
                    {related.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    }

    // Placeholder
    return (
        <div>
            <div className="mb-4 h-5 w-40 rounded bg-gray-200" />
            <style>{css}</style>
            <div className={className}>
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 p-2">
                        <div className="mb-2 aspect-square w-full rounded bg-gray-100" />
                        <div className="h-3 w-3/4 rounded bg-gray-200" />
                        <div className="mt-1 h-3 w-1/3 rounded bg-blue-200" />
                    </div>
                ))}
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
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-600">Columns</label>
                    <select
                        value={s.columns ?? '4'}
                        onChange={(e) => onChange({ ...s, columns: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                        {['2', '3', '4', '5'].map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600">Limit</label>
                    <input
                        type="number"
                        value={s.limit ?? '4'}
                        onChange={(e) => onChange({ ...s, limit: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'related-products',
    version: 1,
    category: 'commerce',
    label: 'Related Products',
    icon: '🔗',
    hasChildren: false,
    defaultSettings: { columns: '4', limit: '4' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
