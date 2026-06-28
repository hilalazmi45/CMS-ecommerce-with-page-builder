import { useState } from 'react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';
import { useStorefront } from '../render/StorefrontContext';
import type { StorefrontProduct, StorefrontVariation } from '../render/StorefrontContext';
import {
    deriveAttributes,
    findMatchingVariation,
    isColorAttribute,
    isValidCssColor,
    resolveVariationPrice,
} from './variationHelpers';
import { formatMoney } from '@/utils/money';

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRating({ rating = 4.5 }: { rating?: number }) {
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`text-base ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
                >
                    ★
                </span>
            ))}
            <span className="ml-1 text-xs text-gray-500">({rating.toFixed(1)})</span>
        </div>
    );
}

// ─── Color swatch button ─────────────────────────────────────────────────────

interface SwatchButtonProps {
    value: string;
    isSelected: boolean;
    onSelect: () => void;
}

function ColorSwatch({ value, isSelected, onSelect }: SwatchButtonProps) {
    const isColor = isValidCssColor(value);

    return (
        <button
            type="button"
            aria-pressed={isSelected}
            aria-label={value}
            onClick={onSelect}
            title={value}
            className={[
                'h-8 w-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                isSelected ? 'border-blue-600 scale-110 shadow-md' : 'border-gray-300 hover:border-gray-400',
            ].join(' ')}
            style={isColor ? { backgroundColor: value } : undefined}
        >
            {!isColor && (
                <span className="flex h-full w-full items-center justify-center text-xs font-semibold leading-none text-gray-700">
                    {value.slice(0, 2).toUpperCase()}
                </span>
            )}
        </button>
    );
}

function ChipButton({ value, isSelected, onSelect }: SwatchButtonProps) {
    return (
        <button
            type="button"
            aria-pressed={isSelected}
            onClick={onSelect}
            className={[
                'rounded border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400',
            ].join(' ')}
        >
            {value}
        </button>
    );
}

// ─── Variation attribute selector ────────────────────────────────────────────

interface AttributeSelectorProps {
    variations: StorefrontVariation[];
    selected: Record<string, string>;
    onChange: (attr: string, value: string) => void;
}

function AttributeSelector({ variations, selected, onChange }: AttributeSelectorProps) {
    const attributes = deriveAttributes(variations);
    if (attributes.length === 0) return null;

    return (
        <div className="space-y-4">
            {attributes.map((attr) => {
                const isColor = isColorAttribute(attr.name);
                const currentVal = selected[attr.name] ?? '';

                return (
                    <fieldset key={attr.name} className="space-y-2">
                        <legend className="text-sm font-semibold text-gray-700">
                            {attr.name}
                            {currentVal && (
                                <span className="ml-1 font-normal text-gray-500">: {currentVal}</span>
                            )}
                        </legend>

                        {isColor ? (
                            /* Color swatches */
                            <div className="flex flex-wrap gap-2" role="group" aria-label={`Select ${attr.name}`}>
                                {attr.values.map((val) => (
                                    <ColorSwatch
                                        key={val}
                                        value={val}
                                        isSelected={currentVal === val}
                                        onSelect={() => { onChange(attr.name, val); }}
                                    />
                                ))}
                            </div>
                        ) : (
                            /* Dropdown for non-color attributes */
                            <div>
                                <label htmlFor={`attr-${attr.name}`} className="sr-only">
                                    {attr.name}
                                </label>
                                <select
                                    id={`attr-${attr.name}`}
                                    value={currentVal}
                                    onChange={(e) => { onChange(attr.name, e.target.value); }}
                                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">— Select {attr.name} —</option>
                                    {attr.values.map((val) => (
                                        <option key={val} value={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </fieldset>
                );
            })}
        </div>
    );
}

// ─── Price block ─────────────────────────────────────────────────────────────

interface PriceBlockProps {
    /** Effective price in integer minor units. */
    effective: number;
    /** Original regular price in minor units; present only when on sale. */
    regular: number | null;
    currency?: string;
}

function PriceBlock({ effective, regular, currency = 'MYR' }: PriceBlockProps) {
    const isOnSale = regular !== null && effective < regular;
    const discountPct = isOnSale && regular
        ? Math.round(((regular - effective) / regular) * 100)
        : 0;

    return (
        <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-blue-700">
                {formatMoney(effective, currency)}
            </span>
            {isOnSale && regular !== null && (
                <>
                    <span className="text-lg text-gray-400 line-through">
                        {formatMoney(regular, currency)}
                    </span>
                    <span className="rounded bg-red-500 px-2 py-0.5 text-sm font-bold text-white">
                        -{discountPct}%
                    </span>
                </>
            )}
        </div>
    );
}

// ─── Main summary view ───────────────────────────────────────────────────────

function SummaryView({ product }: { product: StorefrontProduct }) {
    const [qty, setQty] = useState(1);
    const [selected, setSelected] = useState<Record<string, string>>({});
    // Track displayed image override from a matched variation
    const [variationImageUrl, setVariationImageUrl] = useState<string | null>(null);

    const variations = product.variations ?? [];
    const isVariable = product.type === 'variable' && variations.length > 0;

    // Resolve the currently matched variation (null = not yet fully selected)
    const matchedVariation: StorefrontVariation | null = isVariable
        ? findMatchingVariation(variations, selected)
        : null;

    // Update selected attribute; also update variation image when fully matched
    function handleAttrChange(attr: string, value: string) {
        const next = { ...selected, [attr]: value };
        setSelected(next);
        const match = findMatchingVariation(variations, next);
        setVariationImageUrl(match?.image_url ?? null);
    }

    // Effective price display
    const effectiveMinor: number = (() => {
        if (matchedVariation) return resolveVariationPrice(matchedVariation);
        const base = product.sale_price ?? product.regular_price;
        return base ?? 0;
    })();

    const regularForDisplay: number | null = (() => {
        if (matchedVariation) {
            return matchedVariation.sale_price !== null ? matchedVariation.regular_price : null;
        }
        return product.sale_price !== null && product.sale_price !== undefined ? (product.regular_price ?? null) : null;
    })();

    // S-Coin display (floor of the major unit amount)
    const sCoin = Math.floor(effectiveMinor / 100);

    // Stock status
    const stockStatus: string = matchedVariation
        ? matchedVariation.stock_status
        : product.stock_status;

    const inStock = stockStatus === 'instock';
    const addToCartDisabled = (isVariable && matchedVariation === null) || !inStock;

    return (
        <div className="space-y-4">
            {/* Brand */}
            {product.brand && (
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    {product.brand.name}
                </span>
            )}

            {/* Name */}
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>

            {/* Rating */}
            <StarRating rating={4.5} />

            {/* Variation image override */}
            {variationImageUrl && (
                <img
                    src={variationImageUrl}
                    alt={`${product.name} variation`}
                    className="h-32 w-32 rounded-lg object-cover border border-gray-200"
                    loading="lazy"
                    decoding="async"
                />
            )}

            {/* Price block */}
            <PriceBlock effective={effectiveMinor} regular={regularForDisplay} />

            {/* S-Coin */}
            {sCoin > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                    ✦ Earn {sCoin} S-Coin with this purchase
                </div>
            )}

            {/* Short description */}
            {product.short_description && (
                <p className="text-sm text-gray-600 leading-relaxed">{product.short_description}</p>
            )}

            {/* Variation selectors */}
            {isVariable && (
                <AttributeSelector
                    variations={variations}
                    selected={selected}
                    onChange={handleAttrChange}
                />
            )}

            {/* Stock status indicator */}
            <p
                className={`text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-500'}`}
                aria-live="polite"
            >
                {inStock ? 'In Stock' : 'Out of Stock'}
            </p>

            {/* Quantity + Cart */}
            <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-gray-300">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setQty((q) => Math.max(1, q - 1)); }}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                        aria-label="Decrease quantity"
                    >
                        −
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{qty}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setQty((q) => q + 1); }}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                        aria-label="Increase quantity"
                    >
                        +
                    </button>
                </div>
                <button
                    type="button"
                    disabled={addToCartDisabled}
                    data-variation-id={matchedVariation?.id ?? undefined}
                    onClick={(e) => e.preventDefault()}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isVariable && matchedVariation === null
                        ? 'Select Options'
                        : 'Add to Cart'}
                </button>
            </div>

            {/* Hint when variation not yet fully selected */}
            {isVariable && matchedVariation === null && (
                <p className="text-xs text-amber-600" role="status" aria-live="polite">
                    Please select all options to add this product to your cart.
                </p>
            )}

            {/* Wishlist + Compare */}
            <div className="flex gap-3 text-sm text-gray-500">
                <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-1 hover:text-red-500"
                >
                    ♡ Add to Wishlist
                </button>
                <span aria-hidden="true">·</span>
                <button
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-1 hover:text-blue-600"
                >
                    ⇄ Compare
                </button>
            </div>
        </div>
    );
}

// ─── Editor placeholder ──────────────────────────────────────────────────────

function PlaceholderSummary() {
    return (
        <div className="space-y-3">
            <div className="h-3 w-20 rounded bg-blue-100" />
            <div className="h-7 w-4/5 rounded bg-gray-200" />
            <div className="h-4 w-32 rounded bg-amber-100" />
            <div className="h-8 w-2/5 rounded bg-blue-200" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-4/5 rounded bg-gray-100" />
            {/* Simulated variation swatches */}
            <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-gray-200" />
                <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-red-200 border border-gray-300" />
                    <div className="h-8 w-8 rounded-full bg-blue-200 border border-gray-300" />
                    <div className="h-8 w-8 rounded-full bg-green-200 border border-gray-300" />
                </div>
            </div>
            <div className="flex gap-3">
                <div className="h-10 w-28 rounded-lg border border-gray-200" />
                <div className="h-10 flex-1 rounded-lg bg-blue-200" />
            </div>
        </div>
    );
}

// ─── Widget wrappers ─────────────────────────────────────────────────────────

function Preview({ component: _component }: WidgetPreviewProps) {
    const { currentProduct } = useStorefront();
    return currentProduct ? <SummaryView product={currentProduct} /> : <PlaceholderSummary />;
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

function SettingsPanel({
    component: _component,
    onChange: _onChange,
    onStyleChange: _onStyleChange,
}: WidgetSettingsPanelProps) {
    return (
        <div className="p-3">
            <p className="text-xs text-gray-500">
                Displays name, price, S-Coin, short description, variation selectors (colour swatches
                or dropdowns), and cart controls for the current product page.
            </p>
        </div>
    );
}

// ─── Widget definition ───────────────────────────────────────────────────────

const def: WidgetDefinition = {
    type: 'product-summary',
    version: 1,
    category: 'commerce',
    label: 'Product Summary',
    icon: '📄',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;

// Re-export sub-component for chip-only scenarios (used in tests / storybook)
export { ChipButton };
