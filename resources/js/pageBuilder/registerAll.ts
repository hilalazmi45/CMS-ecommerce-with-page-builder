/**
 * Side-effect import barrel: importing this file registers every widget in the
 * registry and registers widget migrations for version upgrades.
 * Add new widget modules here and they appear in the palette.
 */
import { registerWidgetMigration } from './migrations/registry';
import type { PageComponent } from './types';

// ─── SectionWidget v1 → v2 (A2: added columnTemplate, vAlign, overlayColor, overlayOpacity, _tag, _sticky) ───
registerWidgetMigration('section', 1, (c: PageComponent): PageComponent => {
    const ex = c.settings;
    const migratedSettings: Record<string, unknown> = {
        // Defaults for new v2 keys (will be overwritten by ...ex if already present)
        columnTemplate: '1fr',
        vAlign: 'flex-start',
        overlayColor: '#000000',
        overlayOpacity: '0',
        _tag: 'section',
        _sticky: 'false',
        // Preserve all existing settings (minHeight, background, _label, etc.)
        ...ex,
    };
    // Ensure v2 keys have sensible defaults when they were not in existing
    if (!migratedSettings.columnTemplate) migratedSettings.columnTemplate = '1fr';
    if (!migratedSettings.vAlign) migratedSettings.vAlign = 'flex-start';
    return { ...c, version: 2, settings: migratedSettings };
});

// ─── ColumnsWidget v1 → v2 (A2: `columns` count → `template` string + `customTemplate`) ───
registerWidgetMigration('columns', 1, (c: PageComponent): PageComponent => {
    const cols = parseInt((c.settings.columns as string | undefined) ?? '2') || 2;
    return {
        ...c,
        version: 2,
        settings: {
            ...c.settings,
            template: `repeat(${cols}, minmax(0, 1fr))`,
            customTemplate: typeof c.settings.template === 'string' ? c.settings.template : '',
        },
    };
});

// Tier 1 — layout + core content
import './widgets/SectionWidget';
import './widgets/ContainerWidget';
import './widgets/ColumnsWidget';
import './widgets/HeadingWidget';
import './widgets/TextWidget';
import './widgets/ImageWidget';
import './widgets/ButtonWidget';
import './widgets/SpacerWidget';
import './widgets/DividerWidget';
import './widgets/VideoWidget';
import './widgets/SocialIconsWidget';

// Tier 2 — content / marketing
import './widgets/AccordionWidget';
import './widgets/TabsWidget';
import './widgets/ToggleWidget';
import './widgets/AlertWidget';
import './widgets/TestimonialWidget';
import './widgets/CounterWidget';
import './widgets/ProgressBarWidget';
import './widgets/CallToActionWidget';
import './widgets/CountdownWidget';
import './widgets/IconBoxWidget';
import './widgets/IconListWidget';
import './widgets/ImageBoxWidget';
import './widgets/StarRatingWidget';
import './widgets/ImageGalleryWidget';
import './widgets/ImageCarouselWidget';
import './widgets/GoogleMapsWidget';
import './widgets/BlockquoteWidget';
import './widgets/PriceTableWidget';
import './widgets/PriceListWidget';
import './widgets/FlipBoxWidget';
import './widgets/AnimatedHeadlineWidget';
import './widgets/ShareButtonsWidget';
import './widgets/TableOfContentsWidget';
import './widgets/NavMenuWidget';

// Tier 3 — commerce
import './widgets/ProductGridWidget';
import './widgets/ProductTitleWidget';
import './widgets/ProductPriceWidget';
import './widgets/ProductImageWidget';
import './widgets/AddToCartWidget';
import './widgets/ProductRatingWidget';

// Tier 4 — Woodmart-style header & footer elements (Phase 3)
import './widgets/HeaderTopBarWidget';
import './widgets/HeaderLogoWidget';
import './widgets/HeaderSearchWidget';
import './widgets/HeaderCartWidget';
import './widgets/HeaderAccountWidget';
import './widgets/HeaderWishlistWidget';
import './widgets/HeaderCompareWidget';
import './widgets/HeaderIconLinkWidget';
import './widgets/MainMenuWidget';
import './widgets/FooterColumnWidget';
import './widgets/CopyrightWidget';
import './widgets/AppDownloadWidget';
import './widgets/PaymentIconsWidget';

// Tier 5 — Senheng commerce widgets (Phase 4)
import './widgets/ProductCardWidget';
import './widgets/ProductCategoriesWidget';
import './widgets/ProductTabsWidget';
import './widgets/PromoBannerWidget';
import './widgets/BannerCarouselWidget';
import './widgets/BrandShowcaseWidget';

// Tier 6 — Product page widgets (Phase 5)
import './widgets/ProductGalleryWidget';
import './widgets/ProductSummaryWidget';
import './widgets/ProductTabsInfoWidget';
import './widgets/RelatedProductsWidget';

// Tier 7 — Phase E advanced widgets
import './widgets/SearchWidget';
import './widgets/FormWidget';
import './widgets/PostsWidget';
