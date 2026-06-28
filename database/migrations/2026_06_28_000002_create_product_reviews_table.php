<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table): void {
            $table->id();
            $table->string('ulid', 26)->unique();

            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Display name captured at submission time so it persists even if
            // the user is later deleted (user_id is nulled by the FK constraint).
            $table->string('author_name');

            $table->unsignedTinyInteger('rating'); // 1–5

            $table->string('title', 150)->nullable();
            $table->text('body');

            $table->boolean('is_approved')->default(false);
            $table->boolean('is_verified_purchase')->default(false);

            $table->timestamps();

            // Fast lookup: all approved reviews for a product
            $table->index(['product_id', 'is_approved']);
            // Duplicate-review check: one review per user per product
            $table->index(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};
