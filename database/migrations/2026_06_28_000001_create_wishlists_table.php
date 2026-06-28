<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variation_id')
                ->nullable()
                ->references('id')
                ->on('product_variations')
                ->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            // One row per user + product + variation combination.
            $table->unique(['user_id', 'product_id', 'variation_id']);

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlists');
    }
};
