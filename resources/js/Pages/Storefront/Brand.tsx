/**
 * Storefront brand page.
 *
 * Renders the brand's own builder_content schema. Wraps in
 * StorefrontDataProvider so commerce widgets can access the brand's products.
 */

import { Head } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import {
    StorefrontDataProvider,
    type StorefrontBrand,
    type StorefrontProduct,
    type StorefrontCategory,
} from '@/pageBuilder/render/StorefrontContext';
import type { PageSchema } from '@/pageBuilder/types';

interface BrandProps {
    schema: PageSchema;
    brand: StorefrontBrand;
    products: StorefrontProduct[];
    categories: StorefrontCategory[];
    brands: StorefrontBrand[];
}

export default function Brand({
    schema,
    brand,
    products,
    categories,
    brands,
}: BrandProps) {
    return (
        <StorefrontLayout>
            <Head>
                <title>{brand.name}</title>
            </Head>
            <StorefrontDataProvider
                products={products}
                categories={categories}
                brands={brands}
            >
                <PageRenderer schema={schema} />
            </StorefrontDataProvider>
        </StorefrontLayout>
    );
}
