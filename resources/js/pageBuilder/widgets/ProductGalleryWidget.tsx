import { useState } from 'react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';
import type { StorefrontProductImage } from '../render/StorefrontContext';

function GalleryView({ images }: { images: StorefrontProductImage[] }) {
    const [selected, setSelected] = useState(0);
    const safeSelected = selected < images.length ? selected : 0;
    const active = images[safeSelected];

    if (!active) return null;

    return (
        <div className="flex gap-3">
            {/* Thumbnails */}
            <div className="flex flex-col gap-2">
                {images.map((img, i) => (
                    <button
                        key={img.id}
                        onClick={(e) => { e.preventDefault(); setSelected(i); }}
                        className={`h-16 w-16 overflow-hidden rounded border-2 transition-colors ${
                            i === safeSelected ? 'border-blue-600' : 'border-gray-200 hover:border-blue-300'
                        }`}
                    >
                        <img
                            src={img.url}
                            alt={img.alt ?? `Image ${i + 1}`}
                            className="h-full w-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {/* Main image */}
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                <img
                    src={active.url}
                    alt={active.alt ?? 'Product image'}
                    className="h-full max-h-96 w-full object-contain"
                />
            </div>
        </div>
    );
}

function PlaceholderGallery() {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-16 w-16 rounded border-2 bg-gray-100 ${i === 0 ? 'border-blue-300' : 'border-gray-200'}`} />
                ))}
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center min-h-64">
                <span className="text-5xl text-gray-200">🖼</span>
            </div>
        </div>
    );
}

function Preview({ component: _component }: WidgetPreviewProps) {
    const { currentProduct } = useStorefront();
    const images = currentProduct?.images ?? [];

    return images.length > 0 ? (
        <GalleryView images={images} />
    ) : (
        <PlaceholderGallery />
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
                Displays the current product&apos;s images. Works on single product pages only.
            </p>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-gallery',
    version: 1,
    category: 'commerce',
    label: 'Product Gallery',
    icon: '🖼',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
