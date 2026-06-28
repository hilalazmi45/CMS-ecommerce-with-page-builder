/**
 * Storefront product category page.
 *
 * Renders the category's own builder_content schema. Wraps in
 * StorefrontDataProvider so commerce widgets can access products/categories.
 */

import { Head } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import {
    StorefrontDataProvider,
    type StorefrontCategory,
    type StorefrontProduct,
    type StorefrontBrand,
} from '@/pageBuilder/render/StorefrontContext';
import type { PageSchema } from '@/pageBuilder/types';

interface CategoryProps {
    schema: PageSchema;
    category: StorefrontCategory;
    products: StorefrontProduct[];
    categories: StorefrontCategory[];
    brands: StorefrontBrand[];
}

export default function Category({
    schema,
    category,
    products,
    categories,
    brands,
}: CategoryProps) {
    return (
        <StorefrontLayout>
            <Head>
                <title>{category.name}</title>
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
