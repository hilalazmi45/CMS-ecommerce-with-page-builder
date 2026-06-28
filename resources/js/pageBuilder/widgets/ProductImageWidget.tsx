import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps } from '../types';

function Preview() {
    return (
        <div className="relative">
            <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100 text-gray-300">Product gallery</div>
            <span className="absolute right-2 top-2 text-xs text-blue-400">(dynamic)</span>
        </div>
    );
}

function Editor({ component: _component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview /></div>;
}

function SettingsPanel() {
    return <div className="p-3"><p className="rounded bg-blue-50 p-2 text-xs text-blue-600">Renders the product image gallery with thumbnails on the storefront.</p></div>;
}

const def: WidgetDefinition = {
    type: 'product-image', version: 1, category: 'commerce', label: 'Product Images', icon: '🖼$', hasChildren: false,
    defaultSettings: {}, defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
