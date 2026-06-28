# CMS E-Commerce with Page Builder

A self-hosted visual commerce platform built with **Laravel 13**, **React 19**, and **Inertia.js** — combining a drag-and-drop storefront page builder (inspired by Elementor Pro) with a full WooCommerce-parity commerce engine.

## What Is This?

This is an all-in-one e-commerce platform where store owners can:

- **Design their storefront visually** — drag widgets onto a canvas, configure styles per device (desktop / tablet / mobile), and publish directly — no coding required.
- **Run a complete online store** — manage products, variants, inventory, orders, coupons, shipping zones, customers, and reviews from a built-in admin panel.
- **Build custom pages and theme templates** — headers, footers, product pages, category archives, and CMS pages all use the same visual builder.

Everything runs on a single Laravel application — no WordPress, no plugin runtime, no external CMS dependency.

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
