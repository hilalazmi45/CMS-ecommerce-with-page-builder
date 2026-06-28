<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * D6 — Composite indexes for common filter/sort patterns.
 *
 * Each index is guarded with hasIndex() so the migration is safe to re-run
 * and also idempotent on SQLite (which shares DDL between dev and CI).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── products ──────────────────────────────────────────────────────────
        Schema::table('products', function (Blueprint $table): void {
            // Storefront active-product listing ordered by created_at (latest)
            if (! $this->hasIndex('products', 'products_status_created_at_index')) {
                $table->index(['status', 'created_at'], 'products_status_created_at_index');
            }

            // Brand archive page: WHERE brand_id = ? AND status = 'active'
            if (! $this->hasIndex('products', 'products_brand_id_status_index')) {
                $table->index(['brand_id', 'status'], 'products_brand_id_status_index');
            }

            // Featured products widget: WHERE is_featured = 1 AND status = 'active'
            if (! $this->hasIndex('products', 'products_is_featured_status_index')) {
                $table->index(['is_featured', 'status'], 'products_is_featured_status_index');
            }
        });

        // ── orders ────────────────────────────────────────────────────────────
        Schema::table('orders', function (Blueprint $table): void {
            // My Account order list: WHERE user_id = ? ORDER BY created_at DESC
            if (! $this->hasIndex('orders', 'orders_user_id_created_at_index')) {
                $table->index(['user_id', 'created_at'], 'orders_user_id_created_at_index');
            }

            // Admin orders filtered by status, sorted by date
            if (! $this->hasIndex('orders', 'orders_status_created_at_index')) {
                $table->index(['status', 'created_at'], 'orders_status_created_at_index');
            }
        });

        // ── product_categories ────────────────────────────────────────────────
        Schema::table('product_categories', function (Blueprint $table): void {
            // Category tree build: WHERE parent_id IS NULL / = ? AND is_active = 1
            if (! $this->hasIndex('product_categories', 'product_categories_parent_id_is_active_index')) {
                $table->index(['parent_id', 'is_active'], 'product_categories_parent_id_is_active_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table): void {
            if ($this->hasIndex('products', 'products_status_created_at_index')) {
                $table->dropIndex('products_status_created_at_index');
            }
            if ($this->hasIndex('products', 'products_brand_id_status_index')) {
                $table->dropIndex('products_brand_id_status_index');
            }
            if ($this->hasIndex('products', 'products_is_featured_status_index')) {
                $table->dropIndex('products_is_featured_status_index');
            }
        });

        Schema::table('orders', function (Blueprint $table): void {
            if ($this->hasIndex('orders', 'orders_user_id_created_at_index')) {
                $table->dropIndex('orders_user_id_created_at_index');
            }
            if ($this->hasIndex('orders', 'orders_status_created_at_index')) {
                $table->dropIndex('orders_status_created_at_index');
            }
        });

        // The (parent_id, is_active) composite index cannot be dropped while
        // MySQL considers it as backing the parent_id FK constraint. We wrap
        // the drop in a try/catch so that rollback succeeds on both SQLite
        // (where no FK index conflict exists) and MySQL (where the FK index
        // survives gracefully — the original single-column parent_id FK index
        // continues to satisfy the constraint).
        try {
            Schema::table('product_categories', function (Blueprint $table): void {
                if ($this->hasIndex('product_categories', 'product_categories_parent_id_is_active_index')) {
                    $table->dropIndex('product_categories_parent_id_is_active_index');
                }
            });
        } catch (QueryException) {
            // Silently skip: MySQL FK constraint prevents dropping this index.
            // The composite index will be cleaned up with the table if the
            // owning migration is ever rolled back.
        }
    }

    /**
     * Check whether an index already exists on the given table.
     *
     * Works for both SQLite (dev/test) and MySQL (prod):
     *  - SQLite: PRAGMA index_list does not expose the index name, so we query
     *    sqlite_master which stores the CREATE INDEX statement.
     *  - MySQL: SHOW INDEX FROM <table> WHERE Key_name = '<name>'.
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $result = DB::select(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND name=?",
                [$table, $indexName]
            );

            return ! empty($result);
        }

        // MySQL / MariaDB
        $result = DB::select(
            "SHOW INDEX FROM `{$table}` WHERE Key_name = ?",
            [$indexName]
        );

        return ! empty($result);
    }
};
