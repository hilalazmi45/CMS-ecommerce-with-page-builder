import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps } from '../types';

function Preview() {
    return (
        <div className="flex items-center gap-2">
            <span className="text-lg text-yellow-400">★★★★☆</span>
            <span className="text-sm text-gray-500">(24 reviews)</span>
            <span className="text-xs text-blue-400">(dynamic)</span>
        </div>
    );
}

function Editor({ component: _component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview /></div>;
}

function SettingsPanel() {
    return <div className="p-3"><p className="rounded bg-blue-50 p-2 text-xs text-blue-600">Shows the product&apos;s average rating and review count.</p></div>;
}

const def: WidgetDefinition = {
    type: 'product-rating', version: 1, category: 'commerce', label: 'Product Rating', icon: '★$', hasChildren: false,
    defaultSettings: {}, defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
