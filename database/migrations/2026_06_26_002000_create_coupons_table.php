<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->string('code')->unique();
            $table->string('type'); // fixed_cart|percent|fixed_product|free_shipping
            $table->bigInteger('amount')->default(0); // cents or percent*100
            $table->bigInteger('min_spend')->nullable();
            $table->bigInteger('max_spend')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->unsignedInteger('per_customer_limit')->nullable();
            $table->boolean('individual_use')->default(false);
            $table->boolean('exclude_sale_items')->default(false);
            $table->json('allowed_emails')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('code');
        });

        Schema::create('coupon_product_restrictions', function (Blueprint $table) {
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_excluded')->default(false);
            $table->primary(['coupon_id', 'product_id']);
        });

        Schema::create('coupon_category_restrictions', function (Blueprint $table) {
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_excluded')->default(false);
            $table->primary(['coupon_id', 'product_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_category_restrictions');
        Schema::dropIfExists('coupon_product_restrictions');
        Schema::dropIfExists('coupons');
    }
};
