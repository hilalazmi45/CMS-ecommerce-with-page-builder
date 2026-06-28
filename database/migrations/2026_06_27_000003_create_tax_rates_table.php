<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "SST", "VAT", "GST"
            // NULL = wildcard (matches any). Otherwise an exact match is required.
            $table->string('country', 2)->nullable();   // ISO 3166-1 alpha-2
            $table->string('state', 64)->nullable();
            $table->string('postcode', 16)->nullable();
            // Rate as a fraction, e.g. 0.0600 for 6%. decimal(5,4) → up to 9.9999.
            $table->decimal('rate', 5, 4);
            $table->boolean('is_compound')->default(false);
            $table->unsignedInteger('priority')->default(0);
            $table->timestamps();

            $table->index(['country', 'state']);
            $table->index('priority');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_rates');
    }
};
