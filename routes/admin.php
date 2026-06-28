<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\BuilderController;
use App\Http\Controllers\Admin\BuilderTemplateController;
use App\Http\Controllers\Admin\CmsPageController;
use App\Http\Controllers\Admin\CouponController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DesignSystemController;
use App\Http\Controllers\Admin\InventoryController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ProductBrandController;
use App\Http\Controllers\Admin\ProductCategoryController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\ThemeTemplateController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {

    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    // Phase 1 — RBAC / Users / Settings / Media
    Route::resource('users', UserController::class)->except(['show']);
    Route::resource('roles', RoleController::class)->except(['show']);

    Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
    Route::patch('settings', [SettingController::class, 'update'])->name('settings.update');

    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->name('media.store');
    Route::delete('media/{media}', [MediaController::class, 'destroy'])->name('media.destroy');

    // Phase 2 — Catalogue
    Route::get('inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('inventory/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');

    Route::resource('products', ProductController::class)->except(['show'])->parameters(['products' => 'product:ulid']);
    Route::resource('product-categories', ProductCategoryController::class)->except(['show', 'create', 'edit'])->parameters(['product-categories' => 'productCategory:ulid']);
    Route::resource('product-brands', ProductBrandController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['product-brands' => 'productBrand:ulid']);

    // Phase 3 — Orders
    Route::resource('orders', OrderController::class)->only(['index', 'show'])->parameters(['orders' => 'order:ulid']);
    Route::patch('orders/{order:ulid}/status', [OrderController::class, 'updateStatus'])->name('orders.update-status');
    Route::post('orders/{order:ulid}/notes', [OrderController::class, 'addNote'])->name('orders.add-note');
    Route::post('orders/{order:ulid}/refund', [OrderController::class, 'refund'])->name('orders.refund');

    // Phase 4 — Customers
    Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::patch('customers/{customer}/toggle-active', [CustomerController::class, 'toggleActive'])->name('customers.toggle-active');

    // Phase 5 — Promotions / Coupons
    Route::resource('coupons', CouponController::class)->except(['show'])->parameters(['coupons' => 'coupon:ulid']);

    // Phase 6 — CMS Pages
    Route::resource('cms-pages', CmsPageController::class)->except(['show'])->parameters(['cms-pages' => 'cmsPage:ulid']);
    Route::get('theme-templates', [ThemeTemplateController::class, 'index'])->name('theme-templates.index');
    Route::patch('theme-templates/{themeTemplate:ulid}/conditions', [ThemeTemplateController::class, 'updateConditions'])->name('theme-templates.update-conditions');
    Route::post('cms-pages/{cmsPage}/content', [CmsPageController::class, 'saveContent'])->name('cms-pages.save-content');

    // Phase B7 — Reviews moderation
    Route::get('reviews', [ReviewController::class, 'index'])->name('reviews.index');
    Route::patch('reviews/{review:ulid}/approve', [ReviewController::class, 'approve'])->name('reviews.approve');
    Route::delete('reviews/{review:ulid}', [ReviewController::class, 'destroy'])->name('reviews.destroy');

    // A4 — Design system tokens
    Route::get('settings/design-system', [DesignSystemController::class, 'show'])->name('settings.design-system');
    Route::patch('settings/design-system', [DesignSystemController::class, 'update'])->name('settings.design-system.update');

    // A9 — Page builder templates
    Route::get('builder/templates', [BuilderTemplateController::class, 'index'])->name('builder.templates.index');
    Route::post('builder/templates', [BuilderTemplateController::class, 'store'])->name('builder.templates.store');
    Route::delete('builder/templates/{template:ulid}', [BuilderTemplateController::class, 'destroy'])->name('builder.templates.destroy');

    // Phase 7 — Visual Page Builder (generic: page | category | brand)
    Route::get('builder/{type}/{ulid}/edit', [BuilderController::class, 'edit'])->name('builder.edit');
    Route::post('builder/{type}/{ulid}/save', [BuilderController::class, 'save'])->name('builder.save');
    Route::get('builder/{type}/{ulid}/revisions', [BuilderController::class, 'revisions'])->name('builder.revisions');
    Route::post('builder/{type}/{ulid}/restore', [BuilderController::class, 'restore'])->name('builder.restore');

});
