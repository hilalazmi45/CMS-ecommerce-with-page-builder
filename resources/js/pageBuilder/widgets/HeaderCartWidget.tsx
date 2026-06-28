/**
 * HeaderCartWidget — shows live item count + subtotal from shared cart props.
 *
 * Clicking the icon opens the MiniCartDrawer via the openMiniCart() event so
 * users can peek at their cart without leaving the page. The <a> keeps /cart
 * as a no-JS fallback href.
 *
 * SSR / editor safety:
 *  - usePage() is always available (editor is also an Inertia page), but the
 *    `cart` prop will be undefined in the admin builder context. All cart
 *    access uses optional chaining + defaults so the widget never crashes.
 *  - openMiniCart() is already SSR-safe (guards typeof window internally).
 */

import { usePage } from '@inertiajs/react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';
import type { PageProps, CartSummary } from '@/types';
import { openMiniCart } from '@/utils/miniCart';
import { formatMoney } from '@/utils/money';

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

function CartIcon() {
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely read the shared cart prop — returns null when not available. */
function useCart(): CartSummary | null {
    const props = usePage<PageProps>().props as PageProps & { cart?: CartSummary };
    return props.cart ?? null;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Preview({ component }: WidgetPreviewProps) {
    const { showSubtotal = 'true' } = component.settings as Record<string, string>;
    const cart = useCart();

    const itemCount = cart?.item_count ?? 0;
    const currency = cart?.currency ?? 'MYR';
    const subtotal = cart?.totals.subtotal ?? 0;
    const subtotalFormatted = formatMoney(subtotal, currency);

    function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
        e.preventDefault();
        openMiniCart();
    }

    return (
        <div className="wd-header-cart wd-tools-element relative flex cursor-pointer items-center gap-1">
            <a
                href="/cart"
                onClick={handleClick}
                className="relative flex items-center gap-2 text-gray-700 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                aria-label={`Shopping cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            >
                <span className="wd-tools-icon relative">
                    <CartIcon />
                    <span
                        className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e60012] px-1 text-xs font-bold text-white"
                        aria-hidden="true"
                    >
                        {itemCount}
                    </span>
                </span>

                {showSubtotal === 'true' && (
                    <span
                        className="wd-tools-text hidden whitespace-nowrap text-sm font-bold text-[#e60012] md:block"
                        aria-hidden="true"
                    >
                        {subtotalFormatted}
                    </span>
                )}
            </a>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="showSubtotal"
                    checked={(s.showSubtotal ?? 'true') === 'true'}
                    onChange={(e) =>
                        onChange({ ...s, showSubtotal: e.target.checked ? 'true' : 'false' })
                    }
                    className="rounded"
                />
                <label htmlFor="showSubtotal" className="text-xs font-medium text-gray-600">
                    Show Subtotal
                </label>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Widget definition
// ---------------------------------------------------------------------------

const def: WidgetDefinition = {
    type: 'header-cart',
    version: 1,
    category: 'layout',
    label: 'Header Cart',
    icon: '🛒',
    hasChildren: false,
    defaultSettings: {
        showSubtotal: 'true',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
