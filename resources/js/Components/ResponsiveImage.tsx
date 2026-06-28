import React from 'react';

import type { MediaSrcset } from '@/types';

interface ResponsiveImageProps {
    /** Primary image URL (used as fallback when no srcset is available). */
    url: string;
    /** Srcset map from MediaVariantService — keys like 'webp', '320', '320_webp'. */
    srcset?: MediaSrcset | null;
    width?: number | null;
    height?: number | null;
    alt?: string;
    /**
     * Sizes attribute controlling which srcset entry the browser picks.
     * Defaults to a sensible three-breakpoint rule.
     */
    sizes?: string;
    className?: string;
    /** When true: loading="eager" and decoding="auto" (use for LCP images). */
    priority?: boolean;
    style?: React.CSSProperties;
}

const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 960px) 640px, 960px';

/**
 * Renders a `<picture>` element with a WebP `<source>` and an `<img>` fallback.
 *
 * Degrades gracefully to a plain `<img>` when no srcset data is available.
 * SSR-safe — no browser API is accessed at render time.
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
    url,
    srcset,
    width,
    height,
    alt = '',
    sizes = DEFAULT_SIZES,
    className,
    priority = false,
    style,
}) => {
    const loadingAttr: 'eager' | 'lazy' = priority ? 'eager' : 'lazy';
    const decodingAttr: 'auto' | 'async' = priority ? 'auto' : 'async';

    const widthAttr = width ?? undefined;
    const heightAttr = height ?? undefined;

    if (srcset == null || Object.keys(srcset).length === 0) {
        return (
            <img
                src={url}
                alt={alt}
                width={widthAttr}
                height={heightAttr}
                className={className}
                style={style}
                loading={loadingAttr}
                decoding={decodingAttr}
            />
        );
    }

    const webpSrcsetParts: string[] = [];
    const defaultSrcsetParts: string[] = [];

    for (const w of VARIANT_WIDTHS) {
        const webpKey = `${w}_webp`;
        const defaultKey = String(w);

        const webpVal = srcset[webpKey];
        if (webpVal !== undefined) {
            webpSrcsetParts.push(`${webpVal} ${w}w`);
        }

        const defaultVal = srcset[defaultKey];
        if (defaultVal !== undefined) {
            defaultSrcsetParts.push(`${defaultVal} ${w}w`);
        }
    }

    const hasWebpVariants = webpSrcsetParts.length > 0;
    const hasDefaultVariants = defaultSrcsetParts.length > 0;

    if (!hasWebpVariants && !hasDefaultVariants) {
        return (
            <img
                src={url}
                alt={alt}
                width={widthAttr}
                height={heightAttr}
                className={className}
                style={style}
                loading={loadingAttr}
                decoding={decodingAttr}
            />
        );
    }

    const imgSrcSet = hasDefaultVariants ? defaultSrcsetParts.join(', ') : undefined;

    return (
        <picture>
            {hasWebpVariants && (
                <source
                    type="image/webp"
                    srcSet={webpSrcsetParts.join(', ')}
                    sizes={sizes}
                />
            )}
            {hasDefaultVariants && (
                <source
                    srcSet={defaultSrcsetParts.join(', ')}
                    sizes={sizes}
                />
            )}
            <img
                src={url}
                alt={alt}
                width={widthAttr}
                height={heightAttr}
                className={className}
                style={style}
                loading={loadingAttr}
                decoding={decodingAttr}
                srcSet={imgSrcSet}
                sizes={imgSrcSet !== undefined ? sizes : undefined}
            />
        </picture>
    );
};

export default ResponsiveImage;
