import { useState } from 'react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';

const TABS = ['Description', 'Specifications', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

function Preview({ component: _component }: WidgetPreviewProps) {
    const [activeTab, setActiveTab] = useState<Tab>('Description');
    const { currentProduct } = useStorefront();

    return (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-gray-200">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                        className={`shrink-0 whitespace-nowrap px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
                {activeTab === 'Description' && (
                    <div className="prose prose-sm max-w-none text-gray-700">
                        {currentProduct?.short_description ? (
                            <p>{currentProduct.short_description}</p>
                        ) : (
                            <div className="space-y-2">
                                <div className="h-3 w-full rounded bg-gray-100" />
                                <div className="h-3 w-5/6 rounded bg-gray-100" />
                                <div className="h-3 w-4/5 rounded bg-gray-100" />
                                <div className="h-3 w-full rounded bg-gray-100" />
                                <div className="h-3 w-3/5 rounded bg-gray-100" />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Specifications' && (
                    <table className="w-full text-sm">
                        <tbody>
                            {[
                                ['Brand', currentProduct?.brand?.name ?? '—'],
                                ['Model', currentProduct?.name ?? '—'],
                                ['Status', currentProduct?.stock_status ?? '—'],
                                ['Type', currentProduct?.type ?? '—'],
                            ].map(([key, val]) => (
                                <tr key={key} className="border-b border-gray-50">
                                    <td className="py-2 pr-4 font-medium text-gray-600 w-40">{key}</td>
                                    <td className="py-2 text-gray-800">{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'Reviews' && (
                    <div className="space-y-4">
                        {[
                            { name: 'Ahmad R.', rating: 5, comment: 'Excellent product! Very satisfied with the purchase.' },
                            { name: 'Siti N.', rating: 4, comment: 'Good quality, fast delivery. Would recommend.' },
                        ].map((review, i) => (
                            <div key={i} className="rounded-lg border border-gray-100 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-700">{review.name}</span>
                                    <span className="text-amber-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                            </div>
                        ))}
                    </div>
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

function SettingsPanel({ component: _component, onChange: _onChange, onStyleChange: _onStyleChange }: WidgetSettingsPanelProps) {
    return (
        <div className="p-3">
            <p className="text-xs text-gray-500">
                Tabbed info panel showing Description, Specifications, and Reviews for the current product.
            </p>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-tabs-info',
    version: 1,
    category: 'commerce',
    label: 'Product Info Tabs',
    icon: '📑',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
