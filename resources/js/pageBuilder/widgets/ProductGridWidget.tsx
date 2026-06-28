import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';
import { useStorefront } from '../render/StorefrontContext';
import { responsiveGrid } from '../render/gridStyle';
import { ProductCard } from './ProductCardWidget';

function Preview({ component }: WidgetPreviewProps) {
    const { columns = '4', limit = '8', source = 'latest' } = component.settings as Record<string, string>;
    const { products } = useStorefront();
    const count = Math.min(parseInt(limit) || 8, 12);
    const { className, css } = responsiveGrid(component.id, parseInt(columns) || 4, '16px', { tabletMax: 3, mobileMax: 2 });

    if (products.length > 0) {
        const isOnSale = (p: (typeof products)[number]) =>
            p.sale_price !== null &&
            p.sale_price !== undefined &&
            p.regular_price !== null &&
            p.regular_price !== undefined &&
            p.sale_price < p.regular_price;

        let pool = products;
        if (source === 'featured') pool = products.filter((p) => p.is_featured);
        else if (source === 'on_sale') pool = products.filter(isOnSale);
        else if (source === 'best_selling' || source === 'top_rated') pool = [...products].reverse();
        if (pool.length === 0) pool = products;

        const displayed = pool.slice(0, count);
        return (
            <>
                <style>{css}</style>
                <div className={className}>
                    {displayed.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </>
        );
    }

    // Placeholder when no storefront context (e.g. inside the admin editor)
    return (
        <>
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
        </>
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
            <div>
                <label className="block text-xs font-medium text-gray-600">Source</label>
                <select
                    value={s.source ?? 'latest'}
                    onChange={(e) => onChange({ ...s, source: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="latest">Latest</option>
                    <option value="featured">Featured</option>
                    <option value="on_sale">On Sale</option>
                    <option value="best_selling">Best Selling</option>
                    <option value="top_rated">Top Rated</option>
                    <option value="category">By Category</option>
                </select>
            </div>
            {s.source === 'category' && (
                <input
                    type="text"
                    value={s.categorySlug ?? ''}
                    onChange={(e) => onChange({ ...s, categorySlug: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="category-slug"
                />
            )}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs font-medium text-gray-600">Columns</label>
                    <select
                        value={s.columns ?? '4'}
                        onChange={(e) => onChange({ ...s, columns: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600">Limit</label>
                    <input
                        type="number"
                        value={s.limit ?? '8'}
                        onChange={(e) => onChange({ ...s, limit: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-grid',
    version: 1,
    category: 'commerce',
    label: 'Product Grid',
    icon: '🛍',
    hasChildren: false,
    defaultSettings: { source: 'latest', columns: '4', limit: '8', categorySlug: '' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
