/**
 * HeaderCompareWidget
 *
 * Displays the compare icon with a live badge count in the storefront header.
 * - PreviewComponent: reads compare IDs from localStorage via the compare util.
 * - SSR-safe: defaults to 0 on the server (localStorage unavailable).
 * - In the editor canvas the count safely defaults to 0.
 */

import { useEffect, useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';
import { getCompareIds, onCompareChange } from '@/utils/compare';

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

function CompareIcon() {
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
                d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Preview (storefront render)
// ---------------------------------------------------------------------------

function Preview({ component: _component }: WidgetPreviewProps) {
    // Default to 0 for SSR; populated in useEffect after hydration.
    const [compareCount, setCompareCount] = useState<number>(0);

    useEffect(() => {
        // Initialise from localStorage after hydration.
        setCompareCount(getCompareIds().length);

        // Subscribe to future changes from other widgets / pages.
        return onCompareChange((ids) => setCompareCount(ids.length));
    }, []);

    // Route helper may throw in edge cases.
    let href = '/compare';
    try {
        href = route('compare.index');
    } catch {
        href = '/compare';
    }

    return (
        <div className="wd-header-compare wd-tools-element relative">
            <a
                href={href}
                className="relative flex items-center text-gray-700 hover:text-[#e60012]"
                aria-label={`Compare${compareCount > 0 ? ` (${compareCount} products)` : ''}`}
            >
                <span className="wd-tools-icon relative">
                    <CompareIcon />
                    <span
                        className={[
                            'absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white transition-colors',
                            compareCount > 0 ? 'bg-[#e60012]' : 'bg-gray-400',
                        ].join(' ')}
                        aria-hidden="true"
                    >
                        {compareCount}
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
            {/* Static placeholder — no localStorage in editor context. */}
            <div className="wd-header-compare wd-tools-element relative">
                <span className="relative flex items-center text-gray-700">
                    <span className="wd-tools-icon relative">
                        <CompareIcon />
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
                Compare count is read automatically from the browser&apos;s local storage.
                Links to the compare page at <code>/compare</code>.
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Widget definition
// ---------------------------------------------------------------------------

const def: WidgetDefinition = {
    type: 'header-compare',
    version: 1,
    category: 'layout',
    label: 'Header Compare',
    icon: '⇄',
    hasChildren: false,
    defaultSettings: {},
    defaultStyles: { desktop: {}, tablet: {}, mobile: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
