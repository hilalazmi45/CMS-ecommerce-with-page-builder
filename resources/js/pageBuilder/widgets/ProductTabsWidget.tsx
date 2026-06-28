import { useState } from 'react';
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

const TABS = ['Featured', 'On Sale', 'New', 'Bestsellers'] as const;
type Tab = (typeof TABS)[number];

function Preview({ component }: WidgetPreviewProps) {
    const { columns = '4', limit = '8' } = component.settings as Record<string, string>;
    const [activeTab, setActiveTab] = useState<Tab>('Featured');
    const { products } = useStorefront();
    const cols = parseInt(columns) || 4;
    const count = Math.min(parseInt(limit) || 8, 12);
    const { className, css } = responsiveGrid(component.id, cols, '16px', { tabletMax: 3, mobileMax: 2 });

    const filtered =
        products.length > 0
            ? (() => {
                  switch (activeTab) {
                      case 'Featured':
                          return products.filter((p) => p.is_featured).slice(0, count);
                      case 'On Sale':
                          return products
                              .filter(
                                  (p) =>
                                      p.sale_price !== null &&
                                      p.sale_price !== undefined &&
                                      p.regular_price !== null &&
                                      p.regular_price !== undefined &&
                                      p.sale_price < p.regular_price,
                              )
                              .slice(0, count);
                      case 'New':
                          return products.slice(0, count);
                      case 'Bestsellers':
                          return [...products].reverse().slice(0, count);
                  }
              })()
            : [];

    return (
        <div>
            {/* Tab bar */}
            <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                        className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Products */}
            <style>{css}</style>
            {filtered.length > 0 ? (
                <div className={className}>
                    {filtered.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className={className}>
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-gray-100 p-2">
                            <div className="mb-2 aspect-square w-full rounded bg-gray-100" />
                            <div className="h-3 w-3/4 rounded bg-gray-200" />
                            <div className="mt-1 h-3 w-1/3 rounded bg-blue-200" />
                        </div>
                    ))}
                </div>
            )}
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
    type: 'product-tabs',
    version: 1,
    category: 'commerce',
    label: 'Product Tabs',
    icon: '📋',
    hasChildren: false,
    defaultSettings: { columns: '4', limit: '8' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
