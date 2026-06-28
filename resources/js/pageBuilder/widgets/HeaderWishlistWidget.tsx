/**
 * HeaderWishlistWidget
 *
 * Displays the wishlist icon with a live badge count in the storefront header.
 * - PreviewComponent: reads `wishlist.count` from Inertia shared props (SSR-safe).
 * - Guests see a 0 badge and are linked to the login page.
 * - In the editor canvas the count safely defaults to 0 (no shared props).
 */

import { usePage } from '@inertiajs/react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';
import type { PageProps } from '@/types';

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

function HeartIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Preview (storefront render)
// ---------------------------------------------------------------------------

function Preview({ component: _component }: WidgetPreviewProps) {
    // usePage() may throw if rendered outside an Inertia context (e.g. editor
    // preview). Guard it so the canvas never crashes.
    let wishlistCount = 0;
    let isGuest = true;

    try {
        const page = usePage<PageProps>();
        const wishlist = page.props.wishlist;
        wishlistCount = wishlist?.count ?? 0;
        isGuest = page.props.auth?.user === null || page.props.auth?.user === undefined;
    } catch {
        // Outside Inertia context — use safe defaults.
    }

    // Route helpers may also throw in the editor if Ziggy isn't mounted.
    let href = '/login';
    try {
        href = isGuest ? route('login') : route('account.wishlist');
    } catch {
        href = isGuest ? '/login' : '/my-account/wishlist';
    }

    return (
        <div className="wd-header-wishlist wd-tools-element relative">
            <a
                href={href}
                className="relative flex items-center text-gray-700 hover:text-[#e60012]"
                aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ''}`}
            >
                <span className="wd-tools-icon relative">
                    <HeartIcon />
                    <span
                        className={[
                            'absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white transition-colors',
                            wishlistCount > 0 ? 'bg-[#e60012]' : 'bg-gray-400',
                        ].join(' ')}
                        aria-hidden="true"
                    >
                        {wishlistCount}
                    </span>
                </span>
            </a>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Editor canvas representation
// ---------------------------------------------------------------------------

function Editor({ component: _component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            {/* Static placeholder — Inertia props are unavailable in the editor. */}
            <div className="wd-header-wishlist wd-tools-element relative">
                <span className="relative flex items-center text-gray-700">
                    <span className="wd-tools-icon relative">
                        <HeartIcon />
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs font-bold text-white">
                            0
                        </span>
                    </span>
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

function SettingsPanel({ component: _component, onChange: _onChange }: WidgetSettingsPanelProps) {
    return (
        <div className="p-3">
            <p className="text-xs text-gray-500">
                Wishlist count is read automatically from the user&apos;s account.
                Guests are linked to the login page.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Widget definition
// ---------------------------------------------------------------------------

const def: WidgetDefinition = {
    type: 'header-wishlist',
    version: 1,
    category: 'layout',
    label: 'Header Wishlist',
    icon: '♡',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {}, tablet: {}, mobile: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
