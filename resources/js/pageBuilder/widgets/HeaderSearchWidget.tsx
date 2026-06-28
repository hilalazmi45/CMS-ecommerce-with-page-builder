import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

const DEFAULT_CATEGORIES = [
    'All Categories',
    'Mobiles & Tablets',
    'Computers & Laptops',
    'Home Appliances',
    'TV & Audio',
    'Cameras',
    'Gaming',
    'Kitchen Appliances',
];

function Preview({ component }: WidgetPreviewProps) {
    const {
        placeholder = 'Search for products...',
        showCategoryDropdown = 'true',
    } = component.settings as Record<string, string>;

    return (
        <div className="wd-header-search w-full min-w-0">
            <form
                action="/search"
                method="GET"
                onSubmit={(e) => e.preventDefault()}
                className="flex w-full min-w-0 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm"
            >
                {showCategoryDropdown === 'true' && (
                    <select
                        className="hidden shrink-0 border-r border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 focus:outline-none sm:block"
                        defaultValue=""
                        onClick={(e) => e.preventDefault()}
                    >
                        {DEFAULT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat === 'All Categories' ? '' : cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                )}
                <input
                    type="search"
                    name="q"
                    placeholder={placeholder}
                    className="w-full min-w-0 flex-1 px-4 py-2 text-sm text-gray-700 focus:outline-none"
                />
                <button
                    type="submit"
                    className="flex items-center justify-center bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    aria-label="Search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                </button>
            </form>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Placeholder Text</label>
                <input
                    type="text"
                    value={s.placeholder ?? 'Search for products...'}
                    onChange={(e) => onChange({ ...s, placeholder: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="showCatDropdown"
                    checked={(s.showCategoryDropdown ?? 'true') === 'true'}
                    onChange={(e) => onChange({ ...s, showCategoryDropdown: e.target.checked ? 'true' : 'false' })}
                    className="rounded"
                />
                <label htmlFor="showCatDropdown" className="text-xs font-medium text-gray-600">
                    Show Category Dropdown
                </label>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'header-search',
    version: 1,
    category: 'layout',
    label: 'Header Search',
    icon: '🔍',
    hasChildren: false,
    defaultSettings: {
        placeholder: 'Search for products...',
        showCategoryDropdown: 'true',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
