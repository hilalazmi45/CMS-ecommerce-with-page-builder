<?php

declare(strict_types=1);

use App\Domain\Catalogue\Models\Product;
use App\Domain\Catalogue\Models\ProductReview;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function moderationAdminWithPermissions(string ...$codes): User
{
    $user = User::factory()->create();
    $role = Role::factory()->create(['level' => 2]);

    foreach ($codes as $code) {
        $perm = Permission::factory()->code($code)->create();
        $role->permissions()->attach($perm);
    }

    $user->roles()->attach($role);

    return $user;
}

function moderationProduct(): Product
{
    return Product::create([
        'name' => 'Moderation Product '.uniqid(),
        'slug' => 'mod-product-'.uniqid(),
        'sku' => 'MOD-'.uniqid(),
        'type' => 'simple',
        'status' => 'active',
        'regular_price' => 1000,
        'sale_price' => null,
        'manage_stock' => true,
        'stock_quantity' => 5,
        'reserved_quantity' => 0,
        'backorders' => 'no',
        'stock_status' => 'instock',
    ]);
}

function moderationReview(Product $product, User $author, bool $approved = false): ProductReview
{
    return ProductReview::create([
        'product_id' => $product->id,
        'user_id' => $author->id,
        'author_name' => $author->name,
        'rating' => 4,
        'body' => 'Test review body for moderation.',
        'is_approved' => $approved,
        'is_verified_purchase' => false,
    ]);
}

// ---------------------------------------------------------------------------
// Index — unauthenticated
// ---------------------------------------------------------------------------

it('unauthenticated request is redirected from admin reviews index', function () {
    $this->get(route('admin.reviews.index'))
        ->assertRedirect(route('login'));
});

// ---------------------------------------------------------------------------
// Index — authenticated but no permission → 403
// ---------------------------------------------------------------------------

it('admin without reviews.moderate gets 403 on reviews index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.reviews.index'))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// Index — with permission → 200
// ---------------------------------------------------------------------------

it('admin with reviews.moderate can access reviews index', function () {
    $admin = moderationAdminWithPermissions('reviews.moderate');
    $product = moderationProduct();
    $author = User::factory()->create();
    moderationReview($product, $author, approved: false);

    $this->actingAs($admin)
        ->get(route('admin.reviews.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Reviews/Index')
            ->has('reviews')
            ->has('filters')
        );
});

// ---------------------------------------------------------------------------
// Index — default filter shows only pending
// ---------------------------------------------------------------------------

it('default filter shows only pending reviews', function () {
    $admin = moderationAdminWithPermissions('reviews.moderate');
    $product = moderationProduct();
    $u1 = User::factory()->create();
    $u2 = User::factory()->create();

    moderationReview($product, $u1, approved: false);  // pending
    moderationReview($product, $u2, approved: true);   // approved

    $this->actingAs($admin)
        ->get(route('admin.reviews.index', ['status' => 'pending']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('reviews.total', 1));
});

// ---------------------------------------------------------------------------
// Approve — no permission → 403
// ---------------------------------------------------------------------------

it('admin without reviews.moderate gets 403 on approve', function () {
    $user = User::factory()->create();
    $product = moderationProduct();
    $author = User::factory()->create();
    $review = moderationReview($product, $author, approved: false);

    $this->actingAs($user)
        ->patch(route('admin.reviews.approve', ['review' => $review->ulid]))
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// Approve — with permission → review becomes approved + visible
// ---------------------------------------------------------------------------

it('admin with reviews.moderate can approve a pending review', function () {
    $admin = moderationAdminWithPermissions('reviews.moderate');
    $product = moderationProduct();
    $author = User::factory()->create();
    $review = moderationReview($product, $author, approved: false);

    $this->actingAs($admin)
        ->patch(route('admin.reviews.approve', ['review' => $review->ulid]))
        ->assertRedirect()
        ->assertSessionHas('success');

    $review->refresh();
    expect($review->is_approved)->toBeTrue();

    // The review should now appear on the product page
    $this->get(route('storefront.product', ['product' => $product->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('reviews', 1)
            ->where('reviews.0.body', 'Test review body for moderation.')
        );
});

// ---------------------------------------------------------------------------
// Delete — no permission → 403
// ---------------------------------------------------------------------------

it('admin without reviews.moderate gets 403 on delete', function () {
    $user = User::factory()->create();
    $product = moderationProduct();
    $author = User::factory()->create();
    $review = moderationReview($product, $author, approved: false);

    $this->actingAs($user)
        ->delete(route('admin.reviews.destroy', ['review' => $review->ulid]))
        ->assertForbidden();

    $this->assertModelExists($review);
});

// ---------------------------------------------------------------------------
// Delete — with permission → review gone
// ---------------------------------------------------------------------------

it('admin with reviews.moderate can delete a review', function () {
    $admin = moderationAdminWithPermissions('reviews.moderate');
    $product = moderationProduct();
    $author = User::factory()->create();
    $review = moderationReview($product, $author, approved: true);

    $this->actingAs($admin)
        ->delete(route('admin.reviews.destroy', ['review' => $review->ulid]))
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertModelMissing($review);
});
