import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps } from '../types';

function Preview() {
    return (
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">RM 79.00</span>
            <span className="text-gray-400 line-through">RM 99.00</span>
            <span className="ml-1 text-xs text-blue-400">(dynamic)</span>
        </div>
    );
}

function Editor({ component: _component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview /></div>;
}

function SettingsPanel() {
    return <div className="p-3"><p className="rounded bg-blue-50 p-2 text-xs text-blue-600">Shows the current product&apos;s price (with sale price when active). No settings needed.</p></div>;
}

const def: WidgetDefinition = {
    type: 'product-price', version: 1, category: 'commerce', label: 'Product Price', icon: '$', hasChildren: false,
    defaultSettings: {}, defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
