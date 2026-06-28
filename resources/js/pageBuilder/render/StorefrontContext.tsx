/**
 * StorefrontContext — commerce data context for the public storefront.
 *
 * Controllers eager-load products/categories/brands and pass them as Inertia
 * props; StorefrontDataProvider exposes them via React context. Commerce widgets
 * read from this context via useStorefront().
 *
 * When no provider is present (e.g., in the admin editor), useStorefront()
 * returns safe defaults (empty arrays, undefined currentProduct) so widgets
 * fall back to their placeholder rendering without throwing.
 */

import { createContext, useContext } from 'react';

// ─── Shape types (mirrors Inertia props from storefront controllers) ─────────

export interface StorefrontProductImage {
    id: number;
    url: string;
    alt: string | null;
    is_featured: boolean;
}

/**
 * A single product variation as returned by ProductController.
 * Money values are integer minor units (e.g. 1099 = RM 10.99).
 */
export interface StorefrontVariation {
    id: number;
    sku: string;
    regular_price: number;
    sale_price: number | null;
    stock_status: string;
    manage_stock: boolean;
    stock_quantity: number | null;
    /** e.g. { Color: 'Red', Size: 'M' } */
    attribute_values: Record<string, string>;
    image_url?: string | null;
}

export interface StorefrontProduct {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    short_description: string | null;
    regular_price: number | null;
    sale_price: number | null;
    is_featured: boolean;
    stock_status: string;
    brand?: StorefrontBrand | null;
    categories?: StorefrontCategory[];
    images?: StorefrontProductImage[];
    /** Present on variable products — supplied by ProductController. */
    variations?: StorefrontVariation[];
}

export interface StorefrontCategory {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    is_active: boolean;
    image?: { url: string; alt: string | null } | null;
}

export interface StorefrontBrand {
    id: number;
    ulid: string;
    name: string;
    slug: string;
    is_active: boolean;
    logo?: { url: string; alt: string | null } | null;
}

// ─── Context definition ──────────────────────────────────────────────────────

export interface StorefrontContextValue {
    /** The product being viewed on a single-product page. Undefined elsewhere. */
    currentProduct?: StorefrontProduct;
    /** Products available for grids / carousels on this page. */
    products: StorefrontProduct[];
    /** Active categories for navigation / category widgets. */
    categories: StorefrontCategory[];
    /** Active brands for brand showcase / filter widgets. */
    brands: StorefrontBrand[];
}

const defaultValue: StorefrontContextValue = {
    currentProduct: undefined,
    products: [],
    categories: [],
    brands: [],
};

const StorefrontContext = createContext<StorefrontContextValue>(defaultValue);

// ─── Provider ────────────────────────────────────────────────────────────────

interface StorefrontDataProviderProps extends Partial<StorefrontContextValue> {
    children: React.ReactNode;
}

export function StorefrontDataProvider({
    children,
    currentProduct,
    products = [],
    categories = [],
    brands = [],
}: StorefrontDataProviderProps) {
    return (
        <StorefrontContext.Provider
            value={{ currentProduct, products, categories, brands }}
        >
            {children}
        </StorefrontContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access storefront commerce data from any widget.
 *
 * Safe to call without a provider — returns empty defaults when used in the
 * admin editor where no StorefrontDataProvider is mounted.
 */
export function useStorefront(): StorefrontContextValue {
    return useContext(StorefrontContext);
}
