import AdminLayout from '@/Layouts/AdminLayout';
import { useForm } from '@inertiajs/react';
import { Minus, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
    id: number;
    name: string;
}

interface Brand {
    id: number;
    name: string;
}

interface AttributeValue {
    id: number;
    value: string;
    slug: string;
    color_hex: string | null;
}

interface ProductAttribute {
    id: number;
    name: string;
    slug: string;
    type: 'select' | 'color' | 'button';
    values: AttributeValue[];
}

interface ProductImage {
    id: number;
    media_id: number;
    sort_order: number;
    is_featured: boolean;
    url: string;
    alt: string | null;
}

interface VariationRow {
    /** Present for existing variations; absent for newly added rows. */
    ulid: string;
    attribute_values: Record<string, number>; // {attribute_id: value_id}
    regular_price: number | '';
    sale_price: number | '';
    sku: string;
    stock_quantity: number | '';
    manage_stock: boolean;
    is_active: boolean;
}

interface Product {
    ulid: string;
    name: string;
    slug: string;
    type: 'simple' | 'variable';
    status: 'draft' | 'active' | 'archived';
    short_description: string | null;
    description: string | null;
    sku: string | null;
    regular_price: number | null;
    sale_price: number | null;
    manage_stock: boolean;
    stock_quantity: number | null;
    is_featured: boolean;
    brand_id: number | null;
    category_ids: number[];
    images: ProductImage[];
    variations: Array<{
        ulid: string;
        attribute_values: Record<string, number> | null;
        regular_price: number;
        sale_price: number | null;
        sku: string | null;
        stock_quantity: number | null;
        manage_stock: boolean;
        is_active: boolean;
    }>;
    meta_title: string | null;
    meta_description: string | null;
    og_image_id: number | null;
}

interface Props {
    product?: Product;
    categories: Category[];
    brands: Brand[];
    attributes: ProductAttribute[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlankVariation(): VariationRow {
    return {
        ulid: '',
        attribute_values: {},
        regular_price: '',
        sale_price: '',
        sku: '',
        stock_quantity: '',
        manage_stock: false,
        is_active: true,
    };
}

/**
 * Build the cartesian product of attribute value arrays.
 * e.g. [[1,2], [3,4]] → [[1,3],[1,4],[2,3],[2,4]]
 */
function cartesian(arrays: number[][]): number[][] {
    if (arrays.length === 0) return [[]];
    return arrays.reduce<number[][]>(
        (acc, cur) => acc.flatMap((row) => cur.map((val) => [...row, val])),
        [[]],
    );
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type Tab = 'details' | 'pricing' | 'inventory' | 'variations' | 'gallery' | 'seo' | 'organisation';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProductForm({ product, categories, brands, attributes }: Props) {
    const isEdit = !!product;

    // Derive initial variation rows from existing product data.
    const initialVariations: VariationRow[] = (product?.variations ?? []).map((v) => ({
        ulid: v.ulid,
        attribute_values: v.attribute_values ?? {},
        regular_price: v.regular_price,
        sale_price: v.sale_price ?? '',
        sku: v.sku ?? '',
        stock_quantity: v.stock_quantity ?? '',
        manage_stock: v.manage_stock,
        is_active: v.is_active,
    }));

    const [activeTab, setActiveTab] = useState<Tab>('details');
    const [variationRows, setVariationRows] = useState<VariationRow[]>(initialVariations);

    // Gallery: ordered list of media IDs derived from existing images.
    const initialImageIds = (product?.images ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => img.media_id);

    const { data, setData, post, patch, processing, errors } = useForm({
        name: product?.name ?? '',
        slug: product?.slug ?? '',
        type: product?.type ?? ('simple'),
        status: product?.status ?? ('draft'),
        short_description: product?.short_description ?? '',
        description: product?.description ?? '',
        sku: product?.sku ?? '',
        regular_price: product?.regular_price ?? (''),
        sale_price: product?.sale_price ?? (''),
        manage_stock: product?.manage_stock ?? false,
        stock_quantity: product?.stock_quantity ?? (''),
        is_featured: product?.is_featured ?? false,
        brand_id: product?.brand_id ?? (''),
        category_ids: product?.category_ids ?? ([] as number[]),
        image_ids: initialImageIds,
        meta_title: product?.meta_title ?? '',
        meta_description: product?.meta_description ?? '',
        og_image_id: product?.og_image_id ?? (''),
        variations: initialVariations,
    });

    // Keep form.variations in sync with local state so it serialises correctly.
    function updateVariations(next: VariationRow[]) {
        setVariationRows(next);
        setData('variations', next);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit) {
            patch(route('admin.products.update', product.ulid));
        } else {
            post(route('admin.products.store'));
        }
    }

    function toggleCategory(id: number) {
        const current = data.category_ids;
        setData(
            'category_ids',
            current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
        );
    }

    // ── Gallery helpers ──────────────────────────────────────────────────────
    function moveImage(from: number, to: number) {
        const next = [...data.image_ids];
        const removed = next.splice(from, 1);
        if (removed.length === 0) return;
        next.splice(to, 0, removed[0] as number);
        setData('image_ids', next);
    }

    function removeImage(mediaId: number) {
        setData(
            'image_ids',
            data.image_ids.filter((id) => id !== mediaId),
        );
    }

    function setFeatured(mediaId: number) {
        // Move chosen image to index 0 (first = featured in ProductService).
        const without = data.image_ids.filter((id) => id !== mediaId);
        setData('image_ids', [mediaId, ...without]);
    }

    // ── Variations helpers ───────────────────────────────────────────────────
    function addBlankVariation() {
        updateVariations([...variationRows, makeBlankVariation()]);
    }

    function removeVariation(index: number) {
        updateVariations(variationRows.filter((_, i) => i !== index));
    }

    function updateVariationField<K extends keyof VariationRow>(
        index: number,
        field: K,
        value: VariationRow[K],
    ) {
        const next = variationRows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
        updateVariations(next);
    }

    function updateVariationAttrValue(index: number, attrId: number, valueId: number) {
        const next = variationRows.map((r, i) =>
            i === index
                ? { ...r, attribute_values: { ...r.attribute_values, [attrId]: valueId } }
                : r,
        );
        updateVariations(next);
    }

    /**
     * Auto-generate variation rows from the cartesian product of selected
     * attribute values. Existing rows are cleared.
     */
    function generateMatrix() {
        const attributesWithValues = attributes.filter((attr) => attr.values.length > 0);
        if (attributesWithValues.length === 0) {
            addBlankVariation();
            return;
        }

        const attrIds = attributesWithValues.map((a) => a.id);
        const valueGroups = attributesWithValues.map((a) => a.values.map((v) => v.id));
        const combos = cartesian(valueGroups);

        const rows: VariationRow[] = combos.map((combo) => {
            const attribute_values: Record<string, number> = {};
            combo.forEach((valueId, idx) => {
                const attrId = attrIds[idx];
                if (attrId !== undefined) {
                    attribute_values[String(attrId)] = valueId;
                }
            });
            return { ...makeBlankVariation(), attribute_values };
        });

        updateVariations(rows);
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const tabs: { id: Tab; label: string }[] = [
        { id: 'details', label: 'Details' },
        { id: 'pricing', label: 'Pricing' },
        { id: 'inventory', label: 'Inventory' },
        { id: 'variations', label: 'Variations' },
        { id: 'gallery', label: 'Gallery' },
        { id: 'seo', label: 'SEO' },
        { id: 'organisation', label: 'Organisation' },
    ];

    const tabClass = (id: Tab) =>
        `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
        }`;

    // ── Existing images keyed by media_id ─────────────────────────────────────
    const imageByMediaId: Record<number, ProductImage> = {};
    for (const img of product?.images ?? []) {
        imageByMediaId[img.media_id] = img;
    }

    return (
        <AdminLayout title={isEdit ? 'Edit Product' : 'New Product'}>
            <form onSubmit={submit} className="mx-auto max-w-4xl space-y-0">
                {/* Tab bar */}
                <div className="flex gap-1 border-b border-gray-200 mb-0">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={tabClass(t.id)}
                            onClick={() => setActiveTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-b-lg rounded-tr-lg border border-gray-200 border-t-0 bg-white p-6">

                    {/* ── Details ─────────────────────────────────────────── */}
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">Product Details</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Slug
                                    </label>
                                    <input
                                        type="text"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        SKU
                                    </label>
                                    <input
                                        type="text"
                                        value={data.sku}
                                        onChange={(e) => setData('sku', e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Short Description
                                </label>
                                <textarea
                                    value={data.short_description}
                                    onChange={(e) => setData('short_description', e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={6}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Pricing ─────────────────────────────────────────── */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">Pricing</h2>
                            <p className="text-xs text-gray-500">
                                Prices are stored in minor units (cents). Enter{' '}
                                <code className="bg-gray-100 px-1 rounded">1999</code> for RM 19.99.
                                For variable products, set prices per variation on the Variations tab.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Regular Price (cents)
                                    </label>
                                    <input
                                        type="number"
                                        value={data.regular_price}
                                        onChange={(e) =>
                                            setData(
                                                'regular_price',
                                                e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="e.g. 1999"
                                        min={0}
                                    />
                                    {errors.regular_price && (
                                        <p className="mt-1 text-xs text-red-600">{errors.regular_price}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Sale Price (cents)
                                    </label>
                                    <input
                                        type="number"
                                        value={data.sale_price}
                                        onChange={(e) =>
                                            setData(
                                                'sale_price',
                                                e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                        placeholder="Leave blank if not on sale"
                                        min={0}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Inventory ───────────────────────────────────────── */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">Inventory</h2>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.manage_stock}
                                    onChange={(e) => setData('manage_stock', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Manage stock quantity
                            </label>
                            {data.manage_stock && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Stock Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={data.stock_quantity}
                                        onChange={(e) =>
                                            setData(
                                                'stock_quantity',
                                                e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Variations ─────────────────────────────────────── */}
                    {activeTab === 'variations' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Variations</h2>
                                {data.type === 'variable' && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={generateMatrix}
                                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Generate from Attributes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addBlankVariation}
                                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                        >
                                            <Plus size={14} />
                                            Add Row
                                        </button>
                                    </div>
                                )}
                            </div>

                            {data.type !== 'variable' ? (
                                <p className="text-sm text-gray-500">
                                    Switch the product type to{' '}
                                    <strong>Variable</strong> on the Organisation tab to manage
                                    variations.
                                </p>
                            ) : variationRows.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                    <p className="text-sm text-gray-500">No variations yet.</p>
                                    <button
                                        type="button"
                                        onClick={addBlankVariation}
                                        className="mt-3 text-sm text-blue-600 hover:underline"
                                    >
                                        Add a variation
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-200 rounded-lg text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {attributes.map((attr) => (
                                                    <th
                                                        key={attr.id}
                                                        className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap"
                                                    >
                                                        {attr.name}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    Price (cents) *
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    Sale Price
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    SKU
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    Stock
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    Manage
                                                </th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                                    Active
                                                </th>
                                                <th className="px-3 py-2 border-b border-gray-200" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {variationRows.map((row, i) => (
                                                <tr
                                                    key={i}
                                                    className={`border-b border-gray-100 ${
                                                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                    }`}
                                                >
                                                    {/* Attribute value selects */}
                                                    {attributes.map((attr) => (
                                                        <td
                                                            key={attr.id}
                                                            className="px-3 py-2"
                                                        >
                                                            <select
                                                                value={row.attribute_values[attr.id] ?? ''}
                                                                onChange={(e) =>
                                                                    updateVariationAttrValue(
                                                                        i,
                                                                        attr.id,
                                                                        parseInt(e.target.value, 10),
                                                                    )
                                                                }
                                                                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                                            >
                                                                <option value="">—</option>
                                                                {attr.values.map((v) => (
                                                                    <option key={v.id} value={v.id}>
                                                                        {v.value}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    ))}

                                                    {/* Regular price */}
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.regular_price}
                                                            onChange={(e) =>
                                                                updateVariationField(
                                                                    i,
                                                                    'regular_price',
                                                                    e.target.value === ''
                                                                        ? ''
                                                                        : parseInt(e.target.value, 10),
                                                                )
                                                            }
                                                            className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                                            placeholder="0"
                                                        />
                                                    </td>

                                                    {/* Sale price */}
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.sale_price}
                                                            onChange={(e) =>
                                                                updateVariationField(
                                                                    i,
                                                                    'sale_price',
                                                                    e.target.value === ''
                                                                        ? ''
                                                                        : parseInt(e.target.value, 10),
                                                                )
                                                            }
                                                            className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                                            placeholder="—"
                                                        />
                                                    </td>

                                                    {/* SKU */}
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={row.sku}
                                                            onChange={(e) =>
                                                                updateVariationField(i, 'sku', e.target.value)
                                                            }
                                                            className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                                        />
                                                    </td>

                                                    {/* Stock quantity */}
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.stock_quantity}
                                                            onChange={(e) =>
                                                                updateVariationField(
                                                                    i,
                                                                    'stock_quantity',
                                                                    e.target.value === ''
                                                                        ? ''
                                                                        : parseInt(e.target.value, 10),
                                                                )
                                                            }
                                                            className="w-20 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                                            placeholder="—"
                                                        />
                                                    </td>

                                                    {/* Manage stock checkbox */}
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={row.manage_stock}
                                                            onChange={(e) =>
                                                                updateVariationField(i, 'manage_stock', e.target.checked)
                                                            }
                                                            className="rounded border-gray-300"
                                                        />
                                                    </td>

                                                    {/* Is active checkbox */}
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={row.is_active}
                                                            onChange={(e) =>
                                                                updateVariationField(i, 'is_active', e.target.checked)
                                                            }
                                                            className="rounded border-gray-300"
                                                        />
                                                    </td>

                                                    {/* Delete row */}
                                                    <td className="px-3 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVariation(i)}
                                                            className="text-red-500 hover:text-red-700"
                                                            aria-label="Remove variation"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {errors.variations && (
                                <p className="text-xs text-red-600">{errors.variations}</p>
                            )}
                        </div>
                    )}

                    {/* ── Gallery ─────────────────────────────────────────── */}
                    {activeTab === 'gallery' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">Product Gallery</h2>
                            <p className="text-xs text-gray-500">
                                Reorder images by moving them up/down. The first image is the
                                featured image. To add images, use the Media Library and copy
                                the media ID into the field below.
                            </p>

                            {data.image_ids.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                    <p className="text-sm text-gray-500">No images attached.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.image_ids.map((mediaId, idx) => {
                                        const img = imageByMediaId[mediaId];
                                        return (
                                            <div
                                                key={mediaId}
                                                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                                            >
                                                {img?.url ? (
                                                    <img
                                                        src={img.url}
                                                        alt={img.alt ?? ''}
                                                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
                                                        #{mediaId}
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500">
                                                        Media ID: {mediaId}
                                                        {idx === 0 && (
                                                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs font-medium">
                                                                Featured
                                                            </span>
                                                        )}
                                                    </p>
                                                    {img?.alt && (
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {img.alt}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {idx !== 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFeatured(mediaId)}
                                                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                                        >
                                                            Set Featured
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => moveImage(idx, idx - 1)}
                                                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                                                        aria-label="Move up"
                                                    >
                                                        <Minus size={12} className="rotate-90" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === data.image_ids.length - 1}
                                                        onClick={() => moveImage(idx, idx + 1)}
                                                        className="rounded border border-gray-200 p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                                                        aria-label="Move down"
                                                    >
                                                        <Plus size={12} className="rotate-90" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(mediaId)}
                                                        className="rounded border border-red-200 p-1 text-red-500 hover:bg-red-50"
                                                        aria-label="Remove image"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Manual media ID input */}
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    id="add-media-id"
                                    min={1}
                                    placeholder="Media ID"
                                    className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = parseInt((e.target as HTMLInputElement).value, 10);
                                            if (!isNaN(val) && val > 0 && !data.image_ids.includes(val)) {
                                                setData('image_ids', [...data.image_ids, val]);
                                                (e.target as HTMLInputElement).value = '';
                                            }
                                        }
                                    }}
                                />
                                <label htmlFor="add-media-id" className="self-center text-xs text-gray-500">
                                    Type a media ID and press Enter to attach
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ── SEO ─────────────────────────────────────────────── */}
                    {activeTab === 'seo' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">SEO</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Meta Title
                                </label>
                                <input
                                    type="text"
                                    value={data.meta_title}
                                    onChange={(e) => setData('meta_title', e.target.value)}
                                    maxLength={255}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Defaults to product name"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    {data.meta_title.length}/255 characters
                                </p>
                                {errors.meta_title && (
                                    <p className="mt-1 text-xs text-red-600">{errors.meta_title}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Meta Description
                                </label>
                                <textarea
                                    value={data.meta_description}
                                    onChange={(e) => setData('meta_description', e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Brief description for search engines (max 500 chars)"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    {data.meta_description.length}/500 characters
                                </p>
                                {errors.meta_description && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {errors.meta_description}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    OG Image (Media ID)
                                </label>
                                <input
                                    type="number"
                                    value={data.og_image_id}
                                    onChange={(e) =>
                                        setData(
                                            'og_image_id',
                                            e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                        )
                                    }
                                    className="mt-1 w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Leave blank to use main image"
                                    min={1}
                                />
                                {errors.og_image_id && (
                                    <p className="mt-1 text-xs text-red-600">{errors.og_image_id}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Organisation ────────────────────────────────────── */}
                    {activeTab === 'organisation' && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-gray-900">Organisation</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Type
                                    </label>
                                    <select
                                        value={data.type}
                                        onChange={(e) =>
                                            setData('type', e.target.value as 'simple' | 'variable')
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="simple">Simple</option>
                                        <option value="variable">Variable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Status
                                    </label>
                                    <select
                                        value={data.status}
                                        onChange={(e) =>
                                            setData(
                                                'status',
                                                e.target.value as 'draft' | 'active' | 'archived',
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Brand
                                </label>
                                <select
                                    value={data.brand_id}
                                    onChange={(e) =>
                                        setData(
                                            'brand_id',
                                            e.target.value === '' ? '' : parseInt(e.target.value, 10),
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">— No brand —</option>
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Categories
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((c) => (
                                        <label
                                            key={c.id}
                                            className="flex items-center gap-1.5 text-sm cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.category_ids.includes(c.id)}
                                                onChange={() => toggleCategory(c.id)}
                                                className="rounded border-gray-300"
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.is_featured}
                                    onChange={(e) => setData('is_featured', e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Featured product
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save size={16} />
                        {processing ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}
