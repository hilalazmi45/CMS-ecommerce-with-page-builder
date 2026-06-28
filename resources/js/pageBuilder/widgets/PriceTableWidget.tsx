import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { plan = 'Pro', price = '$29', period = '/mo', features = '', buttonText = 'Choose Plan', featured = false } = component.settings as Record<string, string> & { featured?: boolean };
    const feats = (features).split('\n').filter(Boolean);
    return (
        <div className={`rounded-xl border p-6 text-center ${featured ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}>
            <h3 className="text-lg font-semibold text-gray-900">{plan}</h3>
            <div className="my-3"><span className="text-4xl font-bold text-gray-900">{price}</span><span className="text-gray-500">{period}</span></div>
            <ul className="mb-5 space-y-2 text-sm text-gray-600">{feats.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
            <button className={`w-full rounded-lg py-2 text-sm font-medium ${featured ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'}`}>{buttonText}</button>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string> & { featured?: boolean };
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Plan name</label><input type="text" value={s.plan ?? ''} onChange={(e) => onChange({ ...s, plan: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-600">Price</label><input type="text" value={s.price ?? ''} onChange={(e) => onChange({ ...s, price: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-600">Period</label><input type="text" value={s.period ?? ''} onChange={(e) => onChange({ ...s, period: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600">Features (one per line)</label><textarea value={s.features ?? ''} onChange={(e) => onChange({ ...s, features: e.target.value })} rows={4} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Button text</label><input type="text" value={s.buttonText ?? ''} onChange={(e) => onChange({ ...s, buttonText: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.featured} onChange={(e) => onChange({ ...s, featured: e.target.checked })} /> Featured plan</label>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'price-table', version: 1, category: 'content', label: 'Price Table', icon: '$', hasChildren: false,
    defaultSettings: { plan: 'Pro', price: '$29', period: '/mo', features: 'Unlimited projects\nPriority support\nAdvanced analytics', buttonText: 'Get Started', featured: true },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
