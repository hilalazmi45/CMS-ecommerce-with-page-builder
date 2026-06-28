import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const { rating = '4.5', color = '#facc15', align = 'left' } = component.settings as Record<string, string>;
    const r = parseFloat(rating) || 0;
    return (
        <div className={`flex text-2xl text-${align}`} style={{ color, justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
            {[1, 2, 3, 4, 5].map((i) => <span key={i}>{i <= Math.round(r) ? '★' : '☆'}</span>)}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}><Preview component={component} /></div>;
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div><label className="block text-xs font-medium text-gray-600">Rating (0-5)</label><input type="number" step="0.5" min="0" max="5" value={s.rating ?? '4.5'} onChange={(e) => onChange({ ...s, rating: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Color</label><input type="color" value={s.color ?? '#facc15'} onChange={(e) => onChange({ ...s, color: e.target.value })} className="mt-1 h-8 w-full rounded border border-gray-300 px-1" /></div>
            <div><label className="block text-xs font-medium text-gray-600">Alignment</label><select value={s.align ?? 'left'} onChange={(e) => onChange({ ...s, align: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'star-rating', version: 1, category: 'content', label: 'Star Rating', icon: '★', hasChildren: false,
    defaultSettings: { rating: '4.5', color: '#facc15', align: 'left' },
    defaultStyles: { desktop: {} }, EditorComponent: Editor, PreviewComponent: Preview, SettingsPanel,
};
registerWidget(def);
export default def;
