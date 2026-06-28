import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { quote = '', name = '', role = '', avatar = '', rating = '5' } = component.settings as Record<string, string>;
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-3 flex text-yellow-400">
                {'★'.repeat(parseInt(rating) || 5)}{'☆'.repeat(5 - (parseInt(rating) || 5))}
            </div>
            <p className="mb-4 text-gray-700 italic">&quot;{quote || 'Your testimonial quote here.'}&quot;</p>
            <div className="flex items-center gap-3">
                {avatar && <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />}
                {!avatar && <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">{name.charAt(0) || 'A'}</div>}
                <div>
                    <div className="font-semibold text-gray-900 text-sm">{name || 'Customer Name'}</div>
                    <div className="text-xs text-gray-500">{role || 'Role / Company'}</div>
                </div>
            </div>
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Quote</label>
                <textarea value={s.quote ?? ''} onChange={(e) => onChange({ ...s, quote: e.target.value })} rows={3} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Customer quote..." />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Name</label>
                <input type="text" value={s.name ?? ''} onChange={(e) => onChange({ ...s, name: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Role / Company</label>
                <input type="text" value={s.role ?? ''} onChange={(e) => onChange({ ...s, role: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Rating (1-5)</label>
                <input type="number" min="1" max="5" value={s.rating ?? '5'} onChange={(e) => onChange({ ...s, rating: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'testimonial',
    version: 1,
    category: 'content',
    label: 'Testimonial',
    icon: '❝',
    hasChildren: false,
    defaultSettings: { quote: 'This product changed my life!', name: 'Jane Doe', role: 'CEO, Acme Corp', avatar: '', rating: '5' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
