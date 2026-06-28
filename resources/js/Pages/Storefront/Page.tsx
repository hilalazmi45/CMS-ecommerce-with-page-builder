/**
 * Storefront CMS page (catch-all).
 *
 * Renders any published CmsPage's builder_content schema. Used for standalone
 * pages like About, Contact, FAQ, etc. No commerce context needed.
 */

import { Head } from '@inertiajs/react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import PageRenderer from '@/pageBuilder/render/PageRenderer';
import type { PageSchema } from '@/pageBuilder/types';

interface PageProps {
    schema: PageSchema;
    title: string;
    metaTitle?: string;
    metaDescription?: string;
}

export default function Page({
    schema,
    title,
    metaTitle,
    metaDescription,
}: PageProps) {
    return (
        <StorefrontLayout>
            <Head>
                <title>{metaTitle ?? title}</title>
                {metaDescription && (
                    <meta name="description" content={metaDescription} />
                )}
            </Head>
            <PageRenderer schema={schema} />
        </StorefrontLayout>
    );
}
