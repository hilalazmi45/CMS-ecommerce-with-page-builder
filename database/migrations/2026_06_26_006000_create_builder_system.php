<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Live builder content for any document (page, category, brand, ...)
        Schema::table('cms_pages', function (Blueprint $table) {
            $table->json('builder_content')->nullable()->after('template');
        });

        Schema::table('product_categories', function (Blueprint $table) {
            $table->json('builder_content')->nullable()->after('is_active');
        });

        Schema::table('product_brands', function (Blueprint $table) {
            $table->json('builder_content')->nullable()->after('is_active');
        });

        // Polymorphic revision history for every builder document
        Schema::create('builder_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('owner_type');
            $table->unsignedBigInteger('owner_id');
            $table->json('content');
            $table->string('label')->nullable(); // "Auto-save", "Published", "Restored from #12"
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['owner_type', 'owner_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_revisions');

        Schema::table('product_brands', fn (Blueprint $table) => $table->dropColumn('builder_content'));
        Schema::table('product_categories', fn (Blueprint $table) => $table->dropColumn('builder_content'));
        Schema::table('cms_pages', fn (Blueprint $table) => $table->dropColumn('builder_content'));
    }
};
