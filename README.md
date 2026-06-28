# CMS E-Commerce with Page Builder

This project was built to overcome the core limitations of running an e-commerce store on WordPress — where performance degrades as plugins stack up, Elementor Pro's visual builder and WooCommerce extensions each require separate paid subscriptions, and the entire stack becomes bloated, slow, and expensive to maintain at scale. Instead of patching together a dozen third-party plugins with recurring licence fees, this platform reimplements the same visual page-building experience and full commerce feature set as a single, self-hosted **Laravel 13 + React 19 + Inertia.js** application — giving complete ownership of the codebase, no subscription lock-in, and a significantly lighter and faster architecture.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8.3 · Laravel 13 · Inertia.js v2 |
| Frontend | React 19.2 · TypeScript 5 · Tailwind CSS 4 · Vite 7 |
| Drag & Drop | @dnd-kit |
| Testing | Pest (PHP) · Vitest (JS) |
| Database | SQLite (dev) · MySQL (production) |
| Queue / Cache | Sync / File (dev) · Redis (production) |

---

## Features

### Visual Page Builder
- 65+ drag-and-drop widgets: layout, typography, media, commerce, forms, header/footer
- Per-widget settings and responsive style overrides (desktop → tablet → mobile)
- Undo / redo with bounded history
- Revision history (last 20 auto-saves per document)
- Drag-and-drop canvas with live preview
- Device switcher (desktop / tablet / mobile breakpoints)
- Layer tree panel, widget palette with categories
- Builder powers: CMS pages, product category pages, brand pages, theme header/footer templates

### Theme Builder
- Header and footer templates assignable via display conditions (entire site, specific page, category archive, product page, 404)
- Single product templates and archive templates
- Dynamic content tags (`{product.title}`, `{site.name}`, etc.)

### Commerce Engine
- **Catalogue** — products with variations (size, colour, etc.), attributes, images, brands, categories
- **Inventory** — stock management with movement audit trail, reservation on checkout
- **Cart** — guest + authenticated cart, session merge on login, coupon application
- **Checkout** — single-page multi-step checkout, idempotent order placement, duplicate-submission protection
- **Orders** — order + payment status state machines, status history, admin notes, refunds
- **Coupons** — percent / fixed / free shipping / BOGO, product/category restrictions, per-customer limits, min/max spend, expiry
- **Shipping** — zone-based flat rate, free shipping (with min-order threshold), local pickup
- **Payments** — Cash on Delivery, Stripe (Payment Intents), PayPal (Orders API v2), Billplz FPX, toyyibPay FPX
- **Customers** — saved addresses, order history, wishlist, account dashboard
- **Reviews** — verified-purchase reviews with admin moderation
- **Tax** — configurable tax rates with compound/priority support

### Admin Panel
- Full RBAC — roles, permissions, policies for every resource
- Products, categories, brands, orders, customers, coupons, media, users, roles, settings, CMS pages, theme templates
- Inventory management with inline stock adjustments
- Order detail with status change, notes, and refund workflow
- Media library with upload and management
- Design system token editor (colours, typography, spacing presets)

---

## Getting Started

### Requirements

- PHP 8.3+
- Composer
- Node.js 20+
- SQLite (dev) or MySQL 8+ (production)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/hilalazmi45/CMS-ecommerce-with-page-builder.git
cd CMS-ecommerce-with-page-builder

# 2. Install dependencies
composer install
npm install

# 3. Set up environment
cp .env.example .env
php artisan key:generate

# 4. Run migrations and seed demo data
php artisan migrate --seed

# 5. Link storage
php artisan storage:link
```

### Development

```bash
# Start all servers (Laravel + Queue + Vite) concurrently
composer dev

# Or individually:
php artisan serve
npm run dev
```

Visit `http://localhost:8000`. Admin panel is at `/admin`.

Default super-admin credentials are set by `SuperAdminUserSeeder` — check `database/seeders/SuperAdminUserSeeder.php`.

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```dotenv
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite          # or mysql for production

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_FROM_ADDRESS=hello@example.com

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_SANDBOX=true

# Billplz (Malaysian FPX)
BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=

# toyyibPay
TOYYIBPAY_USER_SECRET_KEY=
TOYYIBPAY_CATEGORY_CODE=
```

---

## Project Structure

```
app/
  Domain/           ← Business logic (Cart, Catalogue, Orders, Payments, Shipping, …)
  Http/Controllers/ ← Admin + Storefront controllers (thin — delegate to Domain)
resources/
  js/
    pageBuilder/    ← Widget registry, builder state hook, renderer
    Pages/          ← React pages (Admin + Storefront)
    Layouts/        ← AdminLayout, StorefrontLayout
database/
  migrations/       ← All schema migrations
  seeders/          ← Demo data including theme templates and products
```

---

## Project Stats

| Item | Count |
|---|---|
| Widgets (drag & drop) | **67** |
| Domain service classes | **32** |
| Database migrations | **34** |
| Automated tests | **51** |
| Domain bounded contexts | **15** |

---

## All 67 Widgets

**Layout**
`SectionWidget` · `ContainerWidget` · `ColumnsWidget` · `SpacerWidget` · `DividerWidget`

**Basic Content**
`HeadingWidget` · `TextWidget` · `ImageWidget` · `ButtonWidget` · `VideoWidget` · `GoogleMapsWidget`

**Advanced Content**
`ImageBoxWidget` · `ImageCarouselWidget` · `ImageGalleryWidget` · `IconBoxWidget` · `IconListWidget` · `TestimonialWidget` · `CounterWidget` · `CountdownWidget` · `ProgressBarWidget` · `PriceListWidget` · `PriceTableWidget` · `StarRatingWidget` · `BlockquoteWidget` · `TabsWidget` · `AccordionWidget` · `ToggleWidget` · `AlertWidget` · `TableOfContentsWidget` · `AnimatedHeadlineWidget` · `FlipBoxWidget`

**Marketing**
`CallToActionWidget` · `BannerCarouselWidget` · `PromoBannerWidget` · `ShareButtonsWidget` · `SocialIconsWidget` · `AppDownloadWidget`

**Commerce**
`ProductGridWidget` · `ProductCardWidget` · `ProductGalleryWidget` · `ProductSummaryWidget` · `ProductTitleWidget` · `ProductPriceWidget` · `ProductRatingWidget` · `ProductTabsWidget` · `ProductTabsInfoWidget` · `ProductImageWidget` · `ProductCategoriesWidget` · `BrandShowcaseWidget` · `RelatedProductsWidget` · `AddToCartWidget` · `SearchWidget` · `PostsWidget`

**Header / Footer**
`HeaderTopBarWidget` · `HeaderLogoWidget` · `HeaderSearchWidget` · `HeaderCartWidget` · `HeaderAccountWidget` · `HeaderWishlistWidget` · `HeaderCompareWidget` · `HeaderIconLinkWidget` · `MainMenuWidget` · `NavMenuWidget` · `FooterColumnWidget` · `CopyrightWidget` · `PaymentIconsWidget`

**Forms**
`FormWidget`

---

## Domain Architecture

15 bounded contexts under `app/Domain/`, each owning its own models, services, and value objects:

```
app/Domain/
├── Cart           → CartService (guest + auth cart, coupon apply, merge on login)
├── Catalogue      → ProductService, CategoryService, ReviewService
├── Checkout       → Checkout coordination
├── Cms            → CmsPageService (CMS pages + revisions)
├── Customers      → Addresses, wishlist
├── Inventory      → InventoryService (stock reservation, movement audit trail)
├── Media          → MediaService, ImageVariantService
├── Orders         → OrderPlacementService, OrderService, RefundService, TaxService
├── PageBuilder    → BuilderService, ConditionResolver
├── Payments       → PaymentGatewayManager, PaymentInitiationService + 5 gateways
├── Pricing        → Money value object (integer minor units — no floating point)
├── Promotions     → CouponService (BOGO, restrictions, atomic redemption)
├── Shared         → IdempotencyService, ActivityLogger
└── Shipping       → ShippingService (zone-based method resolution)
```

---

## Payment Gateways

| Gateway | Type | Market |
|---|---|---|
| Cash on Delivery | Direct | All |
| Stripe | Client Intent (Payment Intents) | Global |
| PayPal | Redirect (Orders API v2) | Global |
| Billplz | Redirect (FPX) | Malaysia |
| toyyibPay | Redirect (FPX) | Malaysia |

All gateways are behind a typed `PaymentGateway` contract. Webhook endpoints verify provider signatures before processing. Secrets are never exposed to the browser.

---

## Security Model

- Every admin action has a **Policy** and a **Form Request** with `authorize()`
- Checkout totals are **100% server-calculated** — no frontend prices trusted
- All money stored as **integer minor units** (no floating point rounding errors)
- **Idempotency keys** prevent duplicate orders and double charges
- Webhook endpoints verify **provider signatures** before processing
- Builder HTML/CSS sanitized with allow-lists before persistence
- Payment secrets loaded via `config()` only — never via `env()` in application code

---

## Full Dependency List

### Backend (PHP)
| Package | Version | Purpose |
|---|---|---|
| laravel/framework | ^12.0 | Core framework |
| inertiajs/inertia-laravel | ^2.0 | Server-side Inertia adapter |
| laravel/sanctum | ^4.0 | API authentication |
| tightenco/ziggy | ^2.0 | Named Laravel routes in JS |

### Frontend (JavaScript)
| Package | Version | Purpose |
|---|---|---|
| react + react-dom | ^19.0 | UI framework |
| @inertiajs/react | ^2.0 | Inertia React adapter |
| @dnd-kit/core + sortable | ^6 / ^10 | Drag-and-drop builder canvas |
| lucide-react | ^0.400 | Icon library (67 widget icons) |
| zod | ^3.23 | Schema validation |
| tailwindcss | ^4.0 | Utility-first CSS |
| @headlessui/react | ^2.0 | Accessible UI primitives |
| vite | ^7.0 | Build tool |
| typescript | ^5.5 | Type safety (`strict: true`) |
| vitest | ^4.0 | Unit testing |
| @testing-library/react | ^16.0 | React component testing |

---

## Development Commands

```bash
composer test           # Run PHP tests (Pest)
npm run test:unit       # Run JS unit tests (Vitest)
npx tsc --noEmit        # TypeScript type check
npm run lint            # ESLint
npm run build           # Production build
./vendor/bin/pint       # PHP code formatting
./vendor/bin/phpstan analyse  # Static analysis
```

---

## License

This project is proprietary software. All rights reserved.
