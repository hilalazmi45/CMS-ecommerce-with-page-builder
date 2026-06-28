import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';
import type { StorefrontProduct } from '../render/StorefrontContext';
import { ProductCard } from './ProductCardWidget';
import { responsiveGrid } from '../render/gridStyle';

// ─── Storefront preview ──────────────────────────────────────────────────────

function Preview({ component }: WidgetPreviewProps) {
    const settings = component.settings as Record<string, string>;
    const source = settings['source'] ?? 'latest';
    const limit = Math.min(Math.max(parseInt(settings['limit'] ?? '6') || 6, 1), 24);
    const columns = Math.min(Math.max(parseInt(settings['columns'] ?? '3') || 3, 1), 6);
    const layout = settings['layout'] ?? 'grid';

    const { products } = useStorefront();

    const isOnSale = (p: StorefrontProduct) =>
        p.sale_price !== null &&
        p.sale_price !== undefined &&
        p.regular_price !== null &&
        p.regular_price !== undefined &&
        p.sale_price < p.regular_price;

    let pool = [...products];
    if (source === 'featured') pool = pool.filter((p) => p.is_featured);
    else if (source === 'on_sale') pool = pool.filter(isOnSale);
    if (pool.length === 0 && products.length > 0) pool = [...products];

    const displayed = pool.slice(0, limit);
    const { className, css } = responsiveGrid(component.id, columns, '16px', { tabletMax: 2, mobileMax: 1 });

    if (displayed.length > 0) {
        if (layout === 'list') {
            return (
                <div className="space-y-4">
                    {displayed.map((product) => {
                        const img = product.images?.find((i) => i.is_featured) ?? product.images?.[0];
                        const price = product.sale_price ?? product.regular_price;
                        const isOnsale = isOnSale(product);
                        return (
                            <a
                                key={product.id}
                                href={`/product/${product.slug}`}
                                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-50">
                                    {img ? (
                                        <img src={img.url} alt={img.alt ?? product.name} className="h-full w-full object-contain" />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center text-2xl">🛍</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{product.name}</p>
                                    {product.brand && (
                                        <p className="text-xs text-gray-400">{product.brand.name}</p>
                                    )}
                                </div>
                                {price !== null && price !== undefined && (
                                    <div className="text-right flex-shrink-0">
                                        {isOnsale && product.regular_price !== null && product.regular_price !== undefined && (
                                            <p className="text-xs text-gray-400 line-through">
                                                RM {(product.regular_price / 100).toFixed(2)}
                                            </p>
                                        )}
                                        <p className="text-sm font-bold text-blue-700">
                                            RM {(price / 100).toFixed(2)}
                                        </p>
                                    </div>
                                )}
                            </a>
                        );
                    })}
                </div>
            );
        }

        // Grid layout
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

    // Placeholder in editor / no products
    if (layout === 'list') {
        return (
            <div className="space-y-3">
                {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3">
                        <div className="h-14 w-14 flex-shrink-0 rounded bg-gray-100" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-2/3 rounded bg-gray-200" />
                            <div className="h-2 w-1/3 rounded bg-gray-100" />
                        </div>
                        <div className="h-4 w-16 rounded bg-blue-100" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <style>{css}</style>
            <div className={className}>
                {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
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

// ─── Editor (canvas) ─────────────────────────────────────────────────────────

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

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Source</label>
                <select
                    value={s['source'] ?? 'latest'}
                    onChange={(e) => onChange({ ...s, source: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="latest">Latest</option>
                    <option value="featured">Featured</option>
                    <option value="on_sale">On Sale</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Layout</label>
                <select
                    value={s['layout'] ?? 'grid'}
                    onChange={(e) => onChange({ ...s, layout: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {s['layout'] !== 'list' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600">Columns</label>
                        <select
                            value={s['columns'] ?? '3'}
                            onChange={(e) => onChange({ ...s, columns: e.target.value })}
                            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                        >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-medium text-gray-600">Limit</label>
                    <input
                        type="number"
                        min={1}
                        max={24}
                        value={s['limit'] ?? '6'}
                        onChange={(e) => onChange({ ...s, limit: e.target.value })}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Widget definition ────────────────────────────────────────────────────────

const def: WidgetDefinition = {
    type: 'posts',
    version: 1,
    category: 'content',
    label: 'Products Query',
    icon: '📦',
    hasChildren: false,
    defaultSettings: {
        source: 'latest',
        limit: '6',
        columns: '3',
        layout: 'grid',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
