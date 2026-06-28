import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { buttonText = 'Add to Cart', showQuantity = true } = component.settings as { buttonText?: string; showQuantity?: boolean };
    return (
        <div className="flex items-center gap-2">
            {showQuantity && <input type="number" defaultValue={1} className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm" />}
            <button className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white">{buttonText}</button>
            <span className="text-xs text-blue-400">(dynamic)</span>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as { buttonText?: string; showQuantity?: boolean };
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Button Text</label><input type="text" value={s.buttonText ?? 'Add to Cart'} onChange={(e) => onChange({ ...s, buttonText: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.showQuantity ?? true} onChange={(e) => onChange({ ...s, showQuantity: e.target.checked })} /> Show quantity selector</label>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'add-to-cart', version: 1, category: 'commerce', label: 'Add to Cart', icon: '🛒', hasChildren: false,
    defaultSettings: { buttonText: 'Add to Cart', showQuantity: true },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
