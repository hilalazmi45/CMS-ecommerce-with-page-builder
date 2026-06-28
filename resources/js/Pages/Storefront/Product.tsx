/**
 * Storefront single product page.
 *
 * Receives a `schema` prop (product theme template builder_content) and the
 * current product data. Wraps the page content in StorefrontDataProvider so
 * commerce widgets (ProductGalleryWidget, ProductSummaryWidget, etc.) can read
 * the current product from context.
 *
 * Also receives `products`, `categories`, and `brands` for widgets that render
 * related products or navigation. Reviews and review summary are rendered in a
 * dedicated section below the builder content.
 */

import { Head, usePage } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import {
    StorefrontDataProvider,
    type StorefrontProduct,
    type StorefrontVariation,
    type StorefrontCategory,
    type StorefrontBrand,
} from '@/pageBuilder/render/StorefrontContext';
import type { PageSchema } from '@/pageBuilder/types';
import ProductReviews, { type ReviewItem, type ReviewSummary } from '@/Pages/Storefront/ProductReviews';
import type { PageProps } from '@/types';

interface ProductProps {
    schema: PageSchema;
    product: StorefrontProduct & { slug: string };
    variations: StorefrontVariation[];
    products: StorefrontProduct[];
    categories: StorefrontCategory[];
    brands: StorefrontBrand[];
    reviews: ReviewItem[];
    reviewSummary: ReviewSummary;
}

export default function Product({
    schema,
    product,
    variations,
    products,
    categories,
    brands,
    reviews,
    reviewSummary,
}: ProductProps) {
    const { auth } = usePage<PageProps>().props;

    // Determine whether the current user has already reviewed this product.
    const userHasReviewed = auth.user !== null && reviews.some(
        (r) => r.author_name === auth.user?.name,
    );

    const submitUrl = route('storefront.product.reviews.store', { product: product.slug });

    return (
        <StorefrontLayout>
            <Head>
                <title>{product.name}</title>
                {product.short_description && (
                    <meta name="description" content={product.short_description} />
                )}
            </Head>
            <StorefrontDataProvider
                currentProduct={{ ...product, variations }}
                products={products}
                categories={categories}
                brands={brands}
            >
                <PageRenderer schema={schema} />

                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <ProductReviews
                        reviews={reviews}
                        reviewSummary={reviewSummary}
                        submitUrl={submitUrl}
                        userHasReviewed={userHasReviewed}
                    />
                </div>
            </StorefrontDataProvider>
        </StorefrontLayout>
    );
}
