<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            // Client-supplied key, scoped so the same key may exist for
            // different operations (e.g. 'checkout' vs 'refund').
            $table->string('scope', 64);
            $table->string('idempotency_key', 128);
            // SHA-256 of the canonical request payload — guards against the same
            // key being reused for a materially different request.
            $table->string('request_fingerprint', 64);
            $table->string('status', 16)->default('processing'); // processing|completed
            $table->json('response')->nullable();
            $table->timestamps();

            $table->unique(['scope', 'idempotency_key']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
