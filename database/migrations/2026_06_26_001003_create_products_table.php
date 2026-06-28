<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable()->unique();
            $table->string('type')->default('simple'); // simple|variable
            $table->string('status')->default('draft'); // draft|active|archived

            $table->text('description')->nullable();
            $table->text('short_description')->nullable();

            // Pricing — integer minor units (cents). Null for variable (price from variations).
            $table->bigInteger('regular_price')->nullable();
            $table->bigInteger('sale_price')->nullable();
            $table->timestamp('sale_starts_at')->nullable();
            $table->timestamp('sale_ends_at')->nullable();

            // Tax
            $table->string('tax_status')->default('taxable'); // taxable|shipping|none
            $table->string('tax_class')->default('');

            // Shipping
            $table->decimal('weight', 10, 2)->nullable(); // grams
            $table->decimal('length', 10, 2)->nullable(); // cm
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->boolean('is_virtual')->default(false);
            $table->boolean('is_downloadable')->default(false);

            // Visibility
            $table->boolean('is_featured')->default(false);
            $table->string('visibility')->default('public'); // public|catalog|search|hidden

            // Inventory (for simple products)
            $table->boolean('manage_stock')->default(false);
            $table->integer('stock_quantity')->nullable();
            $table->string('stock_status')->default('in_stock'); // in_stock|out_of_stock|on_backorder
            $table->string('backorders')->default('no'); // no|notify|yes
            $table->integer('low_stock_amount')->nullable();
            $table->boolean('sold_individually')->default(false);

            $table->foreignId('brand_id')->nullable()->constrained('product_brands')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('type');
            $table->index('brand_id');
        });

        Schema::create('product_category_product', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_category_id')->constrained()->cascadeOnDelete();
            $table->primary(['product_id', 'product_category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_category_product');
        Schema::dropIfExists('products');
    }
};
