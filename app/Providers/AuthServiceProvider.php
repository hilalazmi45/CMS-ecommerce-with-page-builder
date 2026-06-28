<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductCategory;
use App\Domain\Cms\Models\CmsPage;
use App\Domain\Media\Models\Media;
use App\Domain\Orders\Models\Order;
use App\Domain\Promotions\Models\Coupon;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Policies\CmsPagePolicy;
use App\Policies\CouponPolicy;
use App\Policies\MediaPolicy;
use App\Policies\OrderPolicy;
use App\Policies\ProductPolicy;
use App\Policies\RolePolicy;
use App\Policies\SettingPolicy;
use App\Policies\UserPolicy;
use App\Services\RBACService;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /** @var array<class-string, class-string> */
    protected array $policies = [
        User::class => UserPolicy::class,
        Role::class => RolePolicy::class,
        Media::class => MediaPolicy::class,
        Setting::class => SettingPolicy::class,
        Product::class => ProductPolicy::class,
        ProductCategory::class => ProductPolicy::class,
        Order::class => OrderPolicy::class,
        Coupon::class => CouponPolicy::class,
        CmsPage::class => CmsPagePolicy::class,
    ];

    public function register(): void
    {
        $this->app->singleton(RBACService::class);
    }

    public function boot(): void
    {
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        Gate::before(function (User $user, string $ability) {
            if (app(RBACService::class)->isSuperAdmin($user)) {
                return true;
            }

            return null;
        });

        Gate::define('inventory.view', fn (User $user) => app(RBACService::class)->hasPermission($user, 'inventory.view'));
        Gate::define('inventory.adjust', fn (User $user) => app(RBACService::class)->hasPermission($user, 'inventory.adjust'));
        Gate::define('reviews.moderate', fn (User $user) => app(RBACService::class)->hasPermission($user, 'reviews.moderate'));
    }
}
