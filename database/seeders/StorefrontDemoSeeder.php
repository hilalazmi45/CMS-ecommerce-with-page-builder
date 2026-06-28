<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductBrand;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Catalogue\Models\ProductImage;
use App\Domain\Cms\Models\CmsPage;
use App\Domain\Media\Models\Media;
use App\Domain\PageBuilder\Models\ThemeTemplate;
use Illuminate\Database\Seeder;

class StorefrontDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding Senheng storefront demo data…');

        $this->seedBrands();
        $this->seedCategories();
        $this->seedProducts();
        $this->seedHeaderTemplate();
        $this->seedFooterTemplate();
        $this->seedProductTemplate();
        $this->seedHomePage();

        $this->command->info('Done.');
    }

    // ──────────────────────────────────────────────────────────────
    //  Demo catalogue data
    // ──────────────────────────────────────────────────────────────

    private function seedBrands(): void
    {
        $brands = [
            ['name' => 'Apple',     'slug' => 'apple',     'description' => 'Apple Inc.'],
            ['name' => 'Samsung',   'slug' => 'samsung',   'description' => 'Samsung Electronics'],
            ['name' => 'Panasonic', 'slug' => 'panasonic', 'description' => 'Panasonic Corporation'],
            ['name' => 'Sony',      'slug' => 'sony',      'description' => 'Sony Group Corporation'],
        ];

        foreach ($brands as $data) {
            ProductBrand::updateOrCreate(
                ['slug' => $data['slug']],
                array_merge($data, ['is_active' => true])
            );
        }

        $this->command->line('  Brands seeded.');
    }

    private function seedCategories(): void
    {
        $categories = [
            ['name' => 'Mobiles & Tablets',    'slug' => 'mobiles-tablets',    'sort_order' => 1],
            ['name' => 'Computers & Laptops',  'slug' => 'computers-laptops',  'sort_order' => 2],
            ['name' => 'Home Appliances',      'slug' => 'home-appliances',    'sort_order' => 3],
            ['name' => 'TV & Audio',           'slug' => 'tv-audio',           'sort_order' => 4],
            ['name' => 'Cameras',              'slug' => 'cameras',            'sort_order' => 5],
            ['name' => 'Gaming',               'slug' => 'gaming',             'sort_order' => 6],
        ];

        foreach ($categories as $data) {
            ProductCategory::updateOrCreate(
                ['slug' => $data['slug']],
                array_merge($data, ['is_active' => true])
            );
        }

        $this->command->line('  Categories seeded.');
    }

    private function seedProducts(): void
    {
        $apple = ProductBrand::where('slug', 'apple')->first();
        $samsung = ProductBrand::where('slug', 'samsung')->first();
        $panasonic = ProductBrand::where('slug', 'panasonic')->first();
        $sony = ProductBrand::where('slug', 'sony')->first();

        $mobiles = ProductCategory::where('slug', 'mobiles-tablets')->first();
        $computers = ProductCategory::where('slug', 'computers-laptops')->first();
        $appliances = ProductCategory::where('slug', 'home-appliances')->first();
        $tv = ProductCategory::where('slug', 'tv-audio')->first();

        $products = [
            [
                'name' => 'Apple iPhone 15 Pro Max 256GB',
                'slug' => 'apple-iphone-15-pro-max-256gb',
                'sku' => 'APL-IP15PM-256',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 549900,
                'sale_price' => 499900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $apple?->id,
                'categories' => [$mobiles?->id],
                'image_url' => 'https://placehold.co/600x600/1d1d1f/ffffff?text=iPhone+15+Pro+Max',
                'short_description' => 'The most advanced iPhone yet, featuring the A17 Pro chip and titanium design.',
            ],
            [
                'name' => 'Apple MacBook Pro 14" M3 Pro',
                'slug' => 'apple-macbook-pro-14-m3-pro',
                'sku' => 'APL-MBP14-M3',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 849900,
                'sale_price' => null,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $apple?->id,
                'categories' => [$computers?->id],
                'image_url' => 'https://placehold.co/600x600/1d1d1f/ffffff?text=MacBook+Pro+14',
                'short_description' => 'Supercharged by M3 Pro — the most powerful MacBook Pro 14" ever.',
            ],
            [
                'name' => 'Samsung Galaxy S24 Ultra 512GB',
                'slug' => 'samsung-galaxy-s24-ultra-512gb',
                'sku' => 'SAM-GS24U-512',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 529900,
                'sale_price' => 479900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $samsung?->id,
                'categories' => [$mobiles?->id],
                'image_url' => 'https://placehold.co/600x600/1b1b2f/ffffff?text=Galaxy+S24+Ultra',
                'short_description' => 'Galaxy AI is here. The ultimate Galaxy experience with built-in S Pen.',
            ],
            [
                'name' => 'Samsung 65" Neo QLED 8K TV',
                'slug' => 'samsung-65-neo-qled-8k',
                'sku' => 'SAM-TV65-8K',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 1299900,
                'sale_price' => 1099900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $samsung?->id,
                'categories' => [$tv?->id],
                'image_url' => 'https://placehold.co/600x600/1b1b2f/ffffff?text=Samsung+Neo+QLED',
                'short_description' => 'Quantum Matrix Technology for the deepest blacks and brightest highlights.',
            ],
            [
                'name' => 'Panasonic Inverter Air Conditioner 1.5HP',
                'slug' => 'panasonic-inverter-ac-1-5hp',
                'sku' => 'PAN-AC15-INV',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 189900,
                'sale_price' => 169900,
                'is_featured' => false,
                'stock_status' => 'instock',
                'brand_id' => $panasonic?->id,
                'categories' => [$appliances?->id],
                'image_url' => 'https://placehold.co/600x600/0066cc/ffffff?text=Panasonic+AC',
                'short_description' => 'Energy-saving Inverter technology keeps your room perfectly cool.',
            ],
            [
                'name' => 'Panasonic Front Load Washer 10kg',
                'slug' => 'panasonic-front-load-washer-10kg',
                'sku' => 'PAN-WM10-FL',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 249900,
                'sale_price' => null,
                'is_featured' => false,
                'stock_status' => 'instock',
                'brand_id' => $panasonic?->id,
                'categories' => [$appliances?->id],
                'image_url' => 'https://placehold.co/600x600/0066cc/ffffff?text=Panasonic+Washer',
                'short_description' => 'ActiveFoam System for powerful and thorough cleaning.',
            ],
            [
                'name' => 'Sony Bravia XR A95L 55" OLED 4K TV',
                'slug' => 'sony-bravia-xr-a95l-55-oled',
                'sku' => 'SNY-TVA95L-55',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 999900,
                'sale_price' => 899900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $sony?->id,
                'categories' => [$tv?->id],
                'image_url' => 'https://placehold.co/600x600/000000/ffffff?text=Sony+Bravia+OLED',
                'short_description' => 'QD-OLED panel with Cognitive Processor XR for perfect picture.',
            ],
            [
                'name' => 'Samsung Galaxy Tab S9 Ultra 12GB/256GB',
                'slug' => 'samsung-galaxy-tab-s9-ultra',
                'sku' => 'SAM-TS9U-256',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 449900,
                'sale_price' => 399900,
                'is_featured' => false,
                'stock_status' => 'instock',
                'brand_id' => $samsung?->id,
                'categories' => [$mobiles?->id],
                'image_url' => 'https://placehold.co/600x600/1b1b2f/ffffff?text=Galaxy+Tab+S9',
                'short_description' => 'The ultimate Galaxy Tab with a massive Dynamic AMOLED 2X display.',
            ],
            [
                'name' => 'Apple iPad Pro 12.9" M2 256GB WiFi',
                'slug' => 'apple-ipad-pro-12-m2-256gb',
                'sku' => 'APL-IPP12-M2',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 669900,
                'sale_price' => null,
                'is_featured' => false,
                'stock_status' => 'instock',
                'brand_id' => $apple?->id,
                'categories' => [$mobiles?->id],
                'image_url' => 'https://placehold.co/600x600/1d1d1f/ffffff?text=iPad+Pro+12.9',
                'short_description' => 'Supercharged by M2 chip — the most advanced iPad Pro ever.',
            ],
            [
                'name' => 'Panasonic 2-Door Inverter Refrigerator 420L',
                'slug' => 'panasonic-inverter-fridge-420l',
                'sku' => 'PAN-RF420-INV',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 329900,
                'sale_price' => 299900,
                'is_featured' => false,
                'stock_status' => 'instock',
                'brand_id' => $panasonic?->id,
                'categories' => [$appliances?->id],
                'image_url' => 'https://placehold.co/600x600/0066cc/ffffff?text=Panasonic+Fridge',
                'short_description' => 'Prime Fresh+ keeps meat fresh up to 7 days without freezing.',
            ],
            [
                'name' => 'Sony WH-1000XM5 Wireless Headphones',
                'slug' => 'sony-wh-1000xm5',
                'sku' => 'SNY-WH1000XM5',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 169900,
                'sale_price' => 149900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $sony?->id,
                'categories' => [$tv?->id],
                'image_url' => 'https://placehold.co/600x600/000000/ffffff?text=Sony+WH-1000XM5',
                'short_description' => 'Industry-leading noise cancelling headphones with HD sound.',
            ],
            [
                'name' => 'Samsung Galaxy Book4 Pro 360 14"',
                'slug' => 'samsung-galaxy-book4-pro-360',
                'sku' => 'SAM-GB4P360-14',
                'type' => 'simple',
                'status' => 'active',
                'regular_price' => 699900,
                'sale_price' => 649900,
                'is_featured' => true,
                'stock_status' => 'instock',
                'brand_id' => $samsung?->id,
                'categories' => [$computers?->id],
                'image_url' => 'https://placehold.co/600x600/1b1b2f/ffffff?text=Galaxy+Book4+Pro',
                'short_description' => 'Thin and light 2-in-1 laptop with Dynamic AMOLED 2X display.',
            ],
        ];

        foreach ($products as $data) {
            $categories = $data['categories'] ?? [];
            $imageUrl = $data['image_url'];

            unset($data['categories'], $data['image_url']);

            $product = Product::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );

            // Sync categories
            if (! empty($categories)) {
                $product->categories()->syncWithoutDetaching(array_filter($categories));
            }

            // Ensure the product has a featured image pointing at the (external)
            // demo image URL. Idempotent: updates the existing media on re-seed.
            $image = $product->images()->where('is_featured', true)->first()
                ?? $product->images()->first();

            if ($image && $image->media) {
                $image->media->update([
                    'disk' => 'public',
                    'path' => $imageUrl,
                    'alt' => $product->name,
                    'title' => $product->name,
                ]);
            } else {
                $media = Media::create([
                    'disk' => 'public',
                    'path' => $imageUrl,
                    'file_name' => $product->slug.'.jpg',
                    'mime_type' => 'image/jpeg',
                    'extension' => 'jpg',
                    'size' => 0,
                    'alt' => $product->name,
                    'title' => $product->name,
                    'collection' => 'products',
                ]);

                ProductImage::create([
                    'product_id' => $product->id,
                    'media_id' => $media->id,
                    'sort_order' => 0,
                    'is_featured' => true,
                ]);
            }
        }

        $this->command->line('  Products seeded: '.Product::count());
    }

    // ──────────────────────────────────────────────────────────────
    //  Theme Templates
    // ──────────────────────────────────────────────────────────────

    private function seedHeaderTemplate(): void
    {
        $content = [
            'schemaVersion' => 1,
            'components' => [
                // ── Main header row: logo + search + tools ─────────
                [
                    'id' => 'header-section-01',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => [
                        'background' => '#ffffff',
                        'minHeight' => '72px',
                    ],
                    'styles' => ['desktop' => ['padding' => '12px 0']],
                    'children' => [
                        [
                            'id' => 'header-container-01',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => [
                                'maxWidth' => '1280px',
                                'padding' => '0 24px',
                            ],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'header-cols-01',
                                    'type' => 'columns',
                                    'version' => 1,
                                    'settings' => [
                                        // logo (auto) | search (flexible) | tools (auto)
                                        'template' => 'auto minmax(0,1fr) auto',
                                        'gap' => '32px',
                                    ],
                                    'styles' => ['desktop' => ['alignItems' => 'center']],
                                    'children' => [
                                        [
                                            'id' => 'header-logo-01',
                                            'type' => 'header-logo',
                                            'version' => 1,
                                            'settings' => [
                                                'imageUrl' => '',
                                                'link' => '/',
                                                'altText' => 'Senheng',
                                                'logoText' => 'SENHENG',
                                                'textColor' => '#e60012',
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'header-search-01',
                                            'type' => 'header-search',
                                            'version' => 1,
                                            'settings' => [
                                                'placeholder' => 'Search for products',
                                                'showCategoryDropdown' => 'false',
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        // tools group: account | outlets | help | cart
                                        [
                                            'id' => 'header-tools-01',
                                            'type' => 'columns',
                                            'version' => 1,
                                            'settings' => [
                                                'template' => 'auto auto auto auto',
                                                'gap' => '24px',
                                            ],
                                            'styles' => ['desktop' => ['alignItems' => 'center']],
                                            'children' => [
                                                [
                                                    'id' => 'header-account-01',
                                                    'type' => 'header-account',
                                                    'version' => 1,
                                                    'settings' => ['label' => 'Account'],
                                                    'styles' => ['desktop' => []],
                                                ],
                                                [
                                                    'id' => 'header-outlets-01',
                                                    'type' => 'header-icon-link',
                                                    'version' => 1,
                                                    'settings' => ['icon' => 'location', 'label' => 'Outlets', 'url' => '/outlets'],
                                                    'styles' => ['desktop' => []],
                                                ],
                                                [
                                                    'id' => 'header-help-01',
                                                    'type' => 'header-icon-link',
                                                    'version' => 1,
                                                    'settings' => ['icon' => 'help', 'label' => 'Help', 'url' => '/help'],
                                                    'styles' => ['desktop' => []],
                                                ],
                                                [
                                                    'id' => 'header-cart-01',
                                                    'type' => 'header-cart',
                                                    'version' => 1,
                                                    'settings' => ['showSubtotal' => 'true'],
                                                    'styles' => ['desktop' => []],
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Navigation row (Senheng red) ───────────────────
                [
                    'id' => 'header-section-nav',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => [
                        'background' => '#e60012',
                        'minHeight' => '46px',
                    ],
                    'styles' => ['desktop' => ['padding' => '0']],
                    'children' => [
                        [
                            'id' => 'header-container-nav',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => [
                                'maxWidth' => '1280px',
                                'padding' => '0 24px',
                            ],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'header-menu-01',
                                    'type' => 'main-menu',
                                    'version' => 1,
                                    'settings' => [
                                        'items' => [
                                            ['label' => 'Browse Category', 'url' => '/categories', 'children' => [
                                                ['label' => 'Mobiles & Tablets',   'url' => '/product-category/mobiles-tablets'],
                                                ['label' => 'Computers & Laptops', 'url' => '/product-category/computers-laptops'],
                                                ['label' => 'Home Appliances',     'url' => '/product-category/home-appliances'],
                                                ['label' => 'TV & Audio',          'url' => '/product-category/tv-audio'],
                                            ]],
                                            ['label' => 'Brand', 'url' => '/brands', 'children' => []],
                                            ['label' => 'Promotion', 'url' => '/promotions', 'children' => [
                                                ['label' => 'Untung Gila Deals', 'url' => '/promotions/untung-gila'],
                                                ['label' => 'Clearance',         'url' => '/promotions/clearance'],
                                            ]],
                                            ['label' => 'Services', 'url' => '/services', 'children' => [
                                                ['label' => 'Installation',  'url' => '/services/installation'],
                                                ['label' => 'Trade-In',      'url' => '/services/trade-in'],
                                                ['label' => 'Extended Warranty', 'url' => '/services/warranty'],
                                            ]],
                                            ['label' => 'Outlet', 'url' => '/outlets', 'children' => []],
                                            ['label' => 'PlusOne Membership', 'url' => '/plusone', 'children' => [
                                                ['label' => 'Join PlusOne',  'url' => '/plusone/join'],
                                                ['label' => 'Member Rewards', 'url' => '/plusone/rewards'],
                                            ]],
                                            ['label' => 'Corporate', 'url' => '/corporate', 'children' => []],
                                            ['label' => 'Senheng App', 'url' => '/app', 'children' => [
                                                ['label' => 'Download for iOS',     'url' => '/app/ios'],
                                                ['label' => 'Download for Android', 'url' => '/app/android'],
                                            ]],
                                        ],
                                    ],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        ThemeTemplate::updateOrCreate(
            ['type' => 'header', 'name' => 'Senheng Header'],
            [
                'type' => 'header',
                'name' => 'Senheng Header',
                'content' => $content,
                'is_active' => true,
            ]
        );

        $this->command->line('  Header template seeded.');
    }

    private function seedFooterTemplate(): void
    {
        $content = [
            'schemaVersion' => 1,
            'components' => [
                // ── Footer columns section ──────────────────────────
                [
                    'id' => 'footer-section-01',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => [
                        'background' => '#1a1a2e',
                        'minHeight' => '280px',
                    ],
                    'styles' => ['desktop' => ['padding' => '48px 0']],
                    'children' => [
                        [
                            'id' => 'footer-container-01',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => [
                                'maxWidth' => '1280px',
                                'padding' => '0 24px',
                            ],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'footer-cols-01',
                                    'type' => 'columns',
                                    'version' => 1,
                                    'settings' => ['columns' => '4', 'gap' => '32px'],
                                    'styles' => ['desktop' => []],
                                    'children' => [
                                        [
                                            'id' => 'footer-col-customer',
                                            'type' => 'footer-column',
                                            'version' => 1,
                                            'settings' => [
                                                'heading' => 'Customer Care',
                                                'links' => [
                                                    ['label' => 'My Account',      'url' => '/account'],
                                                    ['label' => 'Order Tracking',  'url' => '/orders'],
                                                    ['label' => 'Returns Policy',  'url' => '/returns'],
                                                    ['label' => 'FAQ',             'url' => '/faq'],
                                                    ['label' => 'Contact Us',      'url' => '/contact'],
                                                ],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'footer-col-about',
                                            'type' => 'footer-column',
                                            'version' => 1,
                                            'settings' => [
                                                'heading' => 'About Senheng',
                                                'links' => [
                                                    ['label' => 'About Us',       'url' => '/about'],
                                                    ['label' => 'Careers',        'url' => '/careers'],
                                                    ['label' => 'Investor Relations', 'url' => '/investors'],
                                                    ['label' => 'Store Locator',  'url' => '/stores'],
                                                    ['label' => 'News & Media',   'url' => '/news'],
                                                ],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'footer-col-plusone',
                                            'type' => 'footer-column',
                                            'version' => 1,
                                            'settings' => [
                                                'heading' => 'PlusOne Membership',
                                                'links' => [
                                                    ['label' => 'Join PlusOne',       'url' => '/plusone'],
                                                    ['label' => 'Member Benefits',    'url' => '/plusone/benefits'],
                                                    ['label' => 'Points & Rewards',   'url' => '/plusone/points'],
                                                    ['label' => 'Tier Levels',        'url' => '/plusone/tiers'],
                                                    ['label' => 'Partner Merchants',  'url' => '/plusone/partners'],
                                                ],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'footer-col-quick',
                                            'type' => 'footer-column',
                                            'version' => 1,
                                            'settings' => [
                                                'heading' => 'Quick Links',
                                                'links' => [
                                                    ['label' => 'Promotions',        'url' => '/promotions'],
                                                    ['label' => 'New Arrivals',      'url' => '/new-arrivals'],
                                                    ['label' => 'Best Sellers',      'url' => '/best-sellers'],
                                                    ['label' => 'Corporate Sales',   'url' => '/corporate'],
                                                    ['label' => 'Privacy Policy',    'url' => '/privacy'],
                                                ],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── App download + payment + social row ───────────
                [
                    'id' => 'footer-section-02',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => [
                        'background' => '#16213e',
                        'minHeight' => '100px',
                    ],
                    'styles' => ['desktop' => ['padding' => '32px 0']],
                    'children' => [
                        [
                            'id' => 'footer-container-02',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => [
                                'maxWidth' => '1280px',
                                'padding' => '0 24px',
                            ],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'footer-cols-02',
                                    'type' => 'columns',
                                    'version' => 1,
                                    'settings' => ['columns' => '3', 'gap' => '32px'],
                                    'styles' => ['desktop' => ['alignItems' => 'center']],
                                    'children' => [
                                        [
                                            'id' => 'footer-app-download-01',
                                            'type' => 'app-download',
                                            'version' => 1,
                                            'settings' => [
                                                'heading' => 'Download the Senheng App',
                                                'iosUrl' => 'https://apps.apple.com/my/app/senheng',
                                                'androidUrl' => 'https://play.google.com/store/apps/senheng',
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'footer-payment-01',
                                            'type' => 'payment-icons',
                                            'version' => 1,
                                            'settings' => [
                                                'methods' => ['visa', 'mastercard', 'fpx', 'grabpay', 'tng', 'maybank', 'cimb', 'installment'],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'footer-social-01',
                                            'type' => 'social-icons',
                                            'version' => 1,
                                            'settings' => [
                                                'links' => [
                                                    ['platform' => 'facebook',  'url' => 'https://facebook.com/senheng'],
                                                    ['platform' => 'instagram', 'url' => 'https://instagram.com/senheng'],
                                                    ['platform' => 'youtube',   'url' => 'https://youtube.com/senheng'],
                                                    ['platform' => 'twitter',   'url' => 'https://twitter.com/senheng'],
                                                ],
                                            ],
                                            'styles' => ['desktop' => []],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Copyright bar ──────────────────────────────────
                [
                    'id' => 'footer-copyright-01',
                    'type' => 'copyright',
                    'version' => 1,
                    'settings' => [
                        'text' => '© 2026 Senheng Electric (KL) Sdn Bhd (Company No. 199001003056). All rights reserved. GST No.: 000855090016.',
                        'align' => 'center',
                    ],
                    'styles' => ['desktop' => ['padding' => '16px 0', 'background' => '#0d1117']],
                ],
            ],
        ];

        ThemeTemplate::updateOrCreate(
            ['type' => 'footer', 'name' => 'Senheng Footer'],
            [
                'type' => 'footer',
                'name' => 'Senheng Footer',
                'content' => $content,
                'is_active' => true,
            ]
        );

        $this->command->line('  Footer template seeded.');
    }

    private function seedProductTemplate(): void
    {
        $content = [
            'schemaVersion' => 1,
            'components' => [
                // ── Breadcrumb row ─────────────────────────────────
                [
                    'id' => 'product-section-breadcrumb',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#f5f5f7', 'minHeight' => '48px'],
                    'styles' => ['desktop' => ['padding' => '12px 0']],
                    'children' => [
                        [
                            'id' => 'product-container-breadcrumb',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'product-breadcrumb-text',
                                    'type' => 'text',
                                    'version' => 1,
                                    'settings' => [
                                        'content' => 'Home > Category > Product',
                                        'tag' => 'p',
                                    ],
                                    'styles' => ['desktop' => ['fontSize' => '13px', 'color' => '#6e6e73']],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Gallery + Summary row ──────────────────────────
                [
                    'id' => 'product-section-main',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#ffffff', 'minHeight' => '500px'],
                    'styles' => ['desktop' => ['padding' => '40px 0']],
                    'children' => [
                        [
                            'id' => 'product-container-main',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'product-cols-main',
                                    'type' => 'columns',
                                    'version' => 1,
                                    'settings' => ['columns' => '2', 'gap' => '48px'],
                                    'styles' => ['desktop' => ['alignItems' => 'flex-start']],
                                    'children' => [
                                        [
                                            'id' => 'product-gallery-01',
                                            'type' => 'product-gallery',
                                            'version' => 1,
                                            'settings' => [],
                                            'styles' => ['desktop' => []],
                                        ],
                                        [
                                            'id' => 'product-summary-01',
                                            'type' => 'product-summary',
                                            'version' => 1,
                                            'settings' => [],
                                            'styles' => ['desktop' => []],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Product tabs (description / specs / reviews) ──
                [
                    'id' => 'product-section-tabs',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#ffffff', 'minHeight' => '200px'],
                    'styles' => ['desktop' => ['padding' => '0 0 40px']],
                    'children' => [
                        [
                            'id' => 'product-container-tabs',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'product-tabs-info-01',
                                    'type' => 'product-tabs-info',
                                    'version' => 1,
                                    'settings' => [],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Related products ───────────────────────────────
                [
                    'id' => 'product-section-related',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#f5f5f7', 'minHeight' => '300px'],
                    'styles' => ['desktop' => ['padding' => '40px 0']],
                    'children' => [
                        [
                            'id' => 'product-container-related',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'product-related-heading',
                                    'type' => 'heading',
                                    'version' => 1,
                                    'settings' => [
                                        'text' => 'You May Also Like',
                                        'level' => '2',
                                    ],
                                    'styles' => ['desktop' => ['marginBottom' => '24px']],
                                ],
                                [
                                    'id' => 'product-related-01',
                                    'type' => 'related-products',
                                    'version' => 1,
                                    'settings' => ['columns' => '4', 'limit' => '4'],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        ThemeTemplate::updateOrCreate(
            ['type' => 'product', 'name' => 'Senheng Product Page'],
            [
                'type' => 'product',
                'name' => 'Senheng Product Page',
                'content' => $content,
                'is_active' => true,
            ]
        );

        $this->command->line('  Product template seeded.');
    }

    // ──────────────────────────────────────────────────────────────
    //  CmsPage — home
    // ──────────────────────────────────────────────────────────────

    private function seedHomePage(): void
    {
        $builderContent = [
            'schemaVersion' => 1,
            'components' => [
                // ── Hero banner carousel ───────────────────────────
                [
                    'id' => 'home-carousel-01',
                    'type' => 'banner-carousel',
                    'version' => 1,
                    'settings' => [
                        'slides' => [
                            [
                                'imageUrl' => '',
                                'title' => 'Mega Sale — Up to 70% Off',
                                'subtitle' => 'Grab the best deals on the latest smartphones, laptops, TVs and more.',
                                'buttonText' => 'Shop Now',
                                'buttonUrl' => '/promotions',
                            ],
                            [
                                'imageUrl' => '',
                                'title' => 'New Arrivals Are Here',
                                'subtitle' => 'Discover the newest tech — from Apple to Samsung to Panasonic.',
                                'buttonText' => 'Explore Now',
                                'buttonUrl' => '/new-arrivals',
                            ],
                            [
                                'imageUrl' => '',
                                'title' => 'PlusOne Member Exclusive',
                                'subtitle' => 'Join PlusOne and earn points on every purchase. Members save more!',
                                'buttonText' => 'Join Free',
                                'buttonUrl' => '/plusone',
                            ],
                        ],
                    ],
                    'styles' => ['desktop' => []],
                ],
                // ── Category shortcuts ─────────────────────────────
                [
                    'id' => 'home-section-cats',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#ffffff', 'minHeight' => '160px'],
                    'styles' => ['desktop' => ['padding' => '32px 0']],
                    'children' => [
                        [
                            'id' => 'home-container-cats',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'home-cats-heading',
                                    'type' => 'heading',
                                    'version' => 1,
                                    'settings' => [
                                        'text' => 'Shop by Category',
                                        'level' => '2',
                                    ],
                                    'styles' => ['desktop' => ['marginBottom' => '20px', 'textAlign' => 'center']],
                                ],
                                [
                                    'id' => 'home-product-categories-01',
                                    'type' => 'product-categories',
                                    'version' => 1,
                                    'settings' => [
                                        'columns' => '6',
                                        'showCount' => 'true',
                                    ],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Product tabs (Featured / On Sale / New / etc.) ──
                [
                    'id' => 'home-section-tabs',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#f5f5f7', 'minHeight' => '400px'],
                    'styles' => ['desktop' => ['padding' => '40px 0']],
                    'children' => [
                        [
                            'id' => 'home-container-tabs',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'home-product-tabs-01',
                                    'type' => 'product-tabs',
                                    'version' => 1,
                                    'settings' => [
                                        'columns' => '4',
                                        'limit' => '8',
                                    ],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Promo banner ───────────────────────────────────
                [
                    'id' => 'home-promo-banner-01',
                    'type' => 'promo-banner',
                    'version' => 1,
                    'settings' => [
                        'imageUrl' => '',
                        'title' => 'PlusOne Members Save Even More',
                        'subtitle' => 'Earn points on every ringgit spent. Redeem for discounts, gifts and more. Membership is free!',
                        'buttonText' => 'Join PlusOne Free',
                        'buttonUrl' => '/plusone',
                        'textPosition' => 'left',
                    ],
                    'styles' => ['desktop' => []],
                ],
                // ── Featured products grid ─────────────────────────
                [
                    'id' => 'home-section-featured',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#ffffff', 'minHeight' => '400px'],
                    'styles' => ['desktop' => ['padding' => '40px 0']],
                    'children' => [
                        [
                            'id' => 'home-container-featured',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'home-featured-heading',
                                    'type' => 'heading',
                                    'version' => 1,
                                    'settings' => [
                                        'text' => 'Featured Products',
                                        'level' => '2',
                                    ],
                                    'styles' => ['desktop' => ['marginBottom' => '24px']],
                                ],
                                [
                                    'id' => 'home-product-grid-01',
                                    'type' => 'product-grid',
                                    'version' => 1,
                                    'settings' => [
                                        'source' => 'featured',
                                        'columns' => '4',
                                        'limit' => '8',
                                        'categorySlug' => '',
                                    ],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
                // ── Second promo banner ────────────────────────────
                [
                    'id' => 'home-promo-banner-02',
                    'type' => 'promo-banner',
                    'version' => 1,
                    'settings' => [
                        'imageUrl' => '',
                        'title' => 'Senheng Raya Sale — Deals Up to 70% Off',
                        'subtitle' => 'Limited time offers on top brands. Shop before stocks run out!',
                        'buttonText' => 'View All Deals',
                        'buttonUrl' => '/promotions',
                        'textPosition' => 'right',
                    ],
                    'styles' => ['desktop' => []],
                ],
                // ── Brand showcase ─────────────────────────────────
                [
                    'id' => 'home-section-brands',
                    'type' => 'section',
                    'version' => 1,
                    'settings' => ['background' => '#f5f5f7', 'minHeight' => '160px'],
                    'styles' => ['desktop' => ['padding' => '40px 0']],
                    'children' => [
                        [
                            'id' => 'home-container-brands',
                            'type' => 'container',
                            'version' => 1,
                            'settings' => ['maxWidth' => '1280px', 'padding' => '0 24px'],
                            'styles' => ['desktop' => []],
                            'children' => [
                                [
                                    'id' => 'home-brands-heading',
                                    'type' => 'heading',
                                    'version' => 1,
                                    'settings' => [
                                        'text' => 'Shop by Brand',
                                        'level' => '2',
                                    ],
                                    'styles' => ['desktop' => ['marginBottom' => '24px', 'textAlign' => 'center']],
                                ],
                                [
                                    'id' => 'home-brand-showcase-01',
                                    'type' => 'brand-showcase',
                                    'version' => 1,
                                    'settings' => ['columns' => '6'],
                                    'styles' => ['desktop' => []],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $page = CmsPage::where('slug', 'home')->first();

        if ($page) {
            $page->update([
                'title' => 'Home',
                'status' => 'published',
                'template' => 'home',
                'meta_title' => 'Senheng — Malaysia\'s Leading Electronics Retailer',
                'meta_description' => 'Shop the latest smartphones, laptops, TVs, home appliances and more at Senheng. Best prices, genuine products, islandwide delivery.',
                'builder_content' => $builderContent,
            ]);
        } else {
            CmsPage::create([
                'title' => 'Home',
                'slug' => 'home',
                'status' => 'published',
                'template' => 'home',
                'meta_title' => 'Senheng — Malaysia\'s Leading Electronics Retailer',
                'meta_description' => 'Shop the latest smartphones, laptops, TVs, home appliances and more at Senheng. Best prices, genuine products, islandwide delivery.',
                'builder_content' => $builderContent,
            ]);
        }

        $this->command->line('  Home CmsPage seeded.');
    }
}
