<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Global reusable templates (sections, headers, footers, full pages)
        Schema::create('page_builder_templates', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->string('name');
            $table->string('type')->default('section'); // section|page|header|footer
            $table->json('content'); // versioned page builder JSON
            $table->foreignId('preview_image_id')->nullable()->constrained('media')->nullOnDelete();
            $table->boolean('is_global')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Header/footer/404 theme templates with display conditions
        Schema::create('page_builder_theme_templates', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->string('name');
            $table->string('type'); // header|footer|single|archive|product|404
            $table->json('content');
            $table->json('conditions')->nullable(); // display conditions
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_builder_theme_templates');
        Schema::dropIfExists('page_builder_templates');
    }
};
