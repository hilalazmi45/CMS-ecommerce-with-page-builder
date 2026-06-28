<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reserved stock held for pending/processing orders.
        // available = stock_quantity (on hand) - reserved_quantity.
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('reserved_quantity')->default(0)->after('stock_quantity');
        });

        Schema::table('product_variations', function (Blueprint $table) {
            $table->unsignedInteger('reserved_quantity')->default(0)->after('stock_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            $table->dropColumn('reserved_quantity');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('reserved_quantity');
        });
    }
};
