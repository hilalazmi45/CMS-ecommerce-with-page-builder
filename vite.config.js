import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                /**
                 * D5 — Manual chunk splitting.
                 *
                 * Goals:
                 * - Heavy admin builder editor (dnd-kit, editor panels) must NOT
                 *   land in the storefront entry bundle.
                 * - Core framework packages are split into stable vendor chunks so
                 *   they can be cached independently across deploys.
                 *
                 * NOTE: Vite's SSR build calls this function too. Return undefined
                 * for SSR so Rollup uses its default (single SSR bundle). The
                 * `typeof window` check is not available at build time, so we guard
                 * on Rollup's internal SSR id prefix instead.
                 */
                manualChunks(id) {
                    // React core — must come before other node_modules checks
                    if (
                        id.includes('node_modules/react/') ||
                        id.includes('node_modules/react-dom/')
                    ) {
                        return 'vendor-react';
                    }

                    // Inertia adapter for React
                    if (id.includes('node_modules/@inertiajs/react')) {
                        return 'vendor-inertia';
                    }

                    // Drag-and-drop (admin builder only, but isolated so it
                    // tree-shakes out of storefront chunks).
                    if (id.includes('node_modules/@dnd-kit/')) {
                        return 'vendor-dnd';
                    }

                    // Admin page builder editor — includes the full canvas,
                    // settings panels, and all editor-only UI.
                    if (id.includes('/resources/js/Pages/Admin/PageBuilder/')) {
                        return 'builder-editor';
                    }

                    // Storefront renderer — PageRenderer + StorefrontContext +
                    // grid/style helpers. Shared between SSR and client render.
                    if (id.includes('/resources/js/pageBuilder/render/')) {
                        return 'storefront-renderer';
                    }
                },
            },
        },
    },
});
