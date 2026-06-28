import { useState } from 'react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface MenuItem {
    label: string;
    url: string;
    children?: { label: string; url: string }[];
}

const DEFAULT_ITEMS: MenuItem[] = [
    {
        label: 'Mobiles & Tablets',
        url: '/category/mobiles-tablets',
        children: [
            { label: 'Smartphones', url: '/category/smartphones' },
            { label: 'Tablets', url: '/category/tablets' },
            { label: 'Mobile Accessories', url: '/category/mobile-accessories' },
            { label: 'Smart Watches', url: '/category/smart-watches' },
        ],
    },
    {
        label: 'Computers & Laptops',
        url: '/category/computers-laptops',
        children: [
            { label: 'Laptops', url: '/category/laptops' },
            { label: 'Desktops', url: '/category/desktops' },
            { label: 'Monitors', url: '/category/monitors' },
            { label: 'Printers', url: '/category/printers' },
        ],
    },
    {
        label: 'Home Appliances',
        url: '/category/home-appliances',
        children: [
            { label: 'Refrigerators', url: '/category/refrigerators' },
            { label: 'Washing Machines', url: '/category/washing-machines' },
            { label: 'Air Conditioners', url: '/category/air-conditioners' },
            { label: 'Vacuum Cleaners', url: '/category/vacuum-cleaners' },
        ],
    },
    {
        label: 'TV & Audio',
        url: '/category/tv-audio',
        children: [
            { label: 'Televisions', url: '/category/televisions' },
            { label: 'Soundbars', url: '/category/soundbars' },
            { label: 'Headphones', url: '/category/headphones' },
        ],
    },
    { label: 'Cameras', url: '/category/cameras' },
    { label: 'Gaming', url: '/category/gaming' },
    { label: 'Promotions', url: '/promotions' },
];

function Preview({ component }: WidgetPreviewProps) {
    const items = (component.settings.items ?? DEFAULT_ITEMS) as MenuItem[];
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    return (
        <nav className="wd-header-nav wd-header-main-nav relative" role="navigation" aria-label="Main navigation">
            <ul className="menu wd-nav wd-nav-header flex flex-nowrap items-center gap-0 overflow-x-auto">
                {items.map((item, i) => {
                    const hasChildren = item.children && item.children.length > 0;
                    return (
                        <li
                            key={i}
                            className="relative shrink-0"
                            onMouseEnter={() => hasChildren ? setActiveIndex(i) : undefined}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            <a
                                href={item.url}
                                onClick={(e) => e.preventDefault()}
                                className={`flex items-center gap-1 whitespace-nowrap px-3 py-3.5 text-sm font-medium text-white/90 transition-colors hover:text-white ${activeIndex === i ? 'text-white' : ''}`}
                            >
                                {item.label}
                                {hasChildren && (
                                    <svg className="h-3 w-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </a>

                            {hasChildren && activeIndex === i && (
                                <div className="wd-dropdown absolute left-0 top-full z-50 min-w-[200px] rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
                                    {item.children!.map((child, j) => (
                                        <a
                                            key={j}
                                            href={child.url}
                                            onClick={(e) => e.preventDefault()}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            {child.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const items = (component.settings.items ?? DEFAULT_ITEMS) as MenuItem[];

    function updateItem(i: number, field: keyof MenuItem, value: string) {
        const updated = items.map((item, idx) => idx === i ? { ...item, [field]: value } : item);
        onChange({ ...component.settings, items: updated });
    }

    function addItem() {
        onChange({ ...component.settings, items: [...items, { label: 'New Item', url: '#' }] });
    }

    function removeItem(i: number) {
        onChange({ ...component.settings, items: items.filter((_, idx) => idx !== i) });
    }

    function addChild(i: number) {
        const updated = items.map((item, idx) => {
            if (idx !== i) return item;
            return { ...item, children: [...(item.children ?? []), { label: 'Sub Item', url: '#' }] };
        });
        onChange({ ...component.settings, items: updated });
    }

    function updateChild(i: number, j: number, field: 'label' | 'url', value: string) {
        const updated = items.map((item, idx) => {
            if (idx !== i) return item;
            const children = (item.children ?? []).map((c, cidx) => cidx === j ? { ...c, [field]: value } : c);
            return { ...item, children };
        });
        onChange({ ...component.settings, items: updated });
    }

    function removeChild(i: number, j: number) {
        const updated = items.map((item, idx) => {
            if (idx !== i) return item;
            return { ...item, children: (item.children ?? []).filter((_, cidx) => cidx !== j) };
        });
        onChange({ ...component.settings, items: updated });
    }

    return (
        <div className="space-y-3 p-3">
            {items.map((item, i) => (
                <div key={i} className="rounded border border-gray-200 p-2">
                    <div className="flex gap-1">
                        <input
                            value={item.label}
                            onChange={(e) => updateItem(i, 'label', e.target.value)}
                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="Label"
                        />
                        <input
                            value={item.url}
                            onChange={(e) => updateItem(i, 'url', e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="/url"
                        />
                        <button onClick={() => removeItem(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>

                    {(item.children ?? []).map((child, j) => (
                        <div key={j} className="mt-1 flex gap-1 pl-4">
                            <span className="text-gray-300">└</span>
                            <input
                                value={child.label}
                                onChange={(e) => updateChild(i, j, 'label', e.target.value)}
                                className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
                                placeholder="Sub label"
                            />
                            <input
                                value={child.url}
                                onChange={(e) => updateChild(i, j, 'url', e.target.value)}
                                className="w-20 rounded border border-gray-200 px-2 py-1 text-xs"
                                placeholder="/url"
                            />
                            <button onClick={() => removeChild(i, j)} className="text-xs text-red-300 hover:text-red-500">✕</button>
                        </div>
                    ))}

                    <button
                        onClick={() => addChild(i)}
                        className="mt-1 pl-4 text-xs text-blue-400 hover:text-blue-600"
                    >
                        + sub-item
                    </button>
                </div>
            ))}
            <button
                onClick={addItem}
                className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-blue-400"
            >
                + Add Menu Item
            </button>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'main-menu',
    version: 1,
    category: 'layout',
    label: 'Main Menu',
    icon: '☰',
    hasChildren: false,
    defaultSettings: { items: DEFAULT_ITEMS },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
