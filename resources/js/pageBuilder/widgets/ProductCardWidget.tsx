import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import type { StorefrontProduct } from '../render/StorefrontContext';

// ─── Reusable card component ─────────────────────────────────────────────────

export function ProductCard({ product }: { product: StorefrontProduct }) {
    const featuredImage = product.images?.find((img) => img.is_featured) ?? product.images?.[0];
    const regular = product.regular_price;
    const sale = product.sale_price;
    const effectiveCents = sale !== null && sale !== undefined ? sale : (regular ?? 0);
    const effectivePriceRM = effectiveCents / 100;
    const regularPriceRM = regular !== null && regular !== undefined ? regular / 100 : null;
    const isOnSale =
        sale !== null &&
        sale !== undefined &&
        regular !== null &&
        regular !== undefined &&
        sale < regular;
    const discountPct =
        isOnSale && regularPriceRM
            ? Math.round(((regularPriceRM - effectivePriceRM) / regularPriceRM) * 100)
            : 0;
    const sCoin = Math.floor(effectivePriceRM);

    return (
        <div className="group relative flex flex-col rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
            {/* Discount badge */}
            {isOnSale && discountPct > 0 && (
                <span className="absolute left-2 top-2 z-10 rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    -{discountPct}%
                </span>
            )}

            {/* Product image */}
            <div className="mb-3 aspect-square w-full overflow-hidden rounded-md bg-gray-50">
                {featuredImage ? (
                    <img
                        src={featuredImage.url}
                        alt={featuredImage.alt ?? product.name}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300 text-4xl">
                        🛍
                    </div>
                )}
            </div>

            {/* Brand */}
            {product.brand && (
                <span className="mb-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {product.brand.name}
                </span>
            )}

            {/* Product name */}
            <p className="mb-2 line-clamp-2 flex-1 text-sm font-medium text-gray-800 leading-snug">
                {product.name}
            </p>

            {/* Price block */}
            <div className="mb-2">
                {isOnSale && regularPriceRM !== null && (
                    <div className="text-xs text-gray-400 line-through">
                        RM {regularPriceRM.toFixed(2)}
                    </div>
                )}
                <div className="whitespace-nowrap text-base font-bold text-blue-700">
                    RM {effectivePriceRM.toFixed(2)}
                </div>
            </div>

            {/* S-Coin chip */}
            {sCoin > 0 && (
                <div className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    ✦ {sCoin} S-Coin
                </div>
            )}

            {/* Action row */}
            <div className="mt-auto flex items-center gap-1.5">
                <button
                    onClick={(e) => e.preventDefault()}
                    className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                >
                    Add to Cart
                </button>
                <button
                    onClick={(e) => e.preventDefault()}
                    title="Wishlist"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:border-red-300 hover:text-red-500"
                >
                    ♡
                </button>
                <button
                    onClick={(e) => e.preventDefault()}
                    title="Compare"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:border-blue-300 hover:text-blue-500"
                >
                    ⇄
                </button>
            </div>
        </div>
    );
}

// ─── Placeholder card (editor / no context) ──────────────────────────────────

function PlaceholderCard() {
    return (
        <div className="flex flex-col rounded-lg border border-gray-100 bg-white p-3">
            <div className="mb-3 aspect-square w-full rounded-md bg-gray-100" />
            <div className="mb-1 h-2.5 w-1/4 rounded bg-gray-200" />
            <div className="mb-2 h-3 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/3 rounded bg-blue-200" />
        </div>
    );
}

// ─── Widget preview/editor/settings ─────────────────────────────────────────

function Preview({ component: _component }: WidgetPreviewProps) {
    // Stand-alone widget renders a single placeholder in the editor
    return (
        <div className="max-w-xs">
            <PlaceholderCard />
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
                Product Card renders automatically inside Product Grid or Related Products widgets.
                Place it there to configure it.
            </p>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-card',
    version: 1,
    category: 'commerce',
    label: 'Product Card',
    icon: '🃏',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
