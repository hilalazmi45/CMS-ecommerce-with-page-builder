/**
 * Storefront Home page.
 *
 * Receives a `schema` prop (the published homepage CmsPage builder_content, or
 * an empty schema if none exists) and renders it via PageRenderer inside the
 * StorefrontLayout (which adds the active header + footer from shared props).
 */

import { Head } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import {
    StorefrontDataProvider,
    type StorefrontProduct,
    type StorefrontCategory,
    type StorefrontBrand,
} from '@/pageBuilder/render/StorefrontContext';
import type { PageSchema } from '@/pageBuilder/types';

interface HomeProps {
    schema: PageSchema;
    products: StorefrontProduct[];
    categories: StorefrontCategory[];
    brands: StorefrontBrand[];
    metaTitle?: string;
    metaDescription?: string;
}

export default function Home({
    schema,
    products,
    categories,
    brands,
    metaTitle,
    metaDescription,
}: HomeProps) {
    return (
        <StorefrontLayout>
            <Head>
                <title>{metaTitle ?? 'Home'}</title>
                {metaDescription && (
                    <meta name="description" content={metaDescription} />
                )}
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
