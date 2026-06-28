import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

// Dynamic single-product widget. Binds to the current product on the storefront;
// shows a sample in the editor.
function Preview({ component }: WidgetPreviewProps) {
    const { tag = 'h1', sample = 'Sample Product Name' } = component.settings as Record<string, string>;
    const Tag = tag as 'h1' | 'h2';
    return <Tag className="text-3xl font-bold text-gray-900">{sample} <span className="ml-1 align-middle text-xs font-normal text-blue-400">(dynamic)</span></Tag>;
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <p className="rounded bg-blue-50 p-2 text-xs text-blue-600">Pulls the product title automatically on single-product pages.</p>
            <div><label className="block text-xs font-medium text-gray-600">HTML tag</label><select value={s.tag ?? 'h1'} onChange={(e) => onChange({ ...s, tag: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"><option value="h1">H1</option><option value="h2">H2</option></select></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'product-title', version: 1, category: 'commerce', label: 'Product Title', icon: 'T$', hasChildren: false,
    defaultSettings: { tag: 'h1', sample: 'Sample Product Name' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
