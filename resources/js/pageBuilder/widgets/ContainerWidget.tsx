import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component, children }: WidgetPreviewProps) {
    const { maxWidth = '1200px', padding = '0 24px' } = component.settings as Record<string, string>;
    return <div style={{ maxWidth, margin: '0 auto', padding }}>{children}</div>;
}

function Editor({ component, isSelected, onSelect, children }: WidgetEditorProps) {
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`relative mx-auto min-h-[40px] rounded ${isSelected ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-blue-200'}`}
            style={{ maxWidth: (component.settings as Record<string, string>).maxWidth ?? '1200px', padding: (component.settings as Record<string, string>).padding ?? '0 24px' }}
        >
            {isSelected && <div className="absolute right-2 top-1 rounded bg-blue-400 px-2 py-0.5 text-xs text-white">Container</div>}
            {children}
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Max Width</label>
                <select value={s.maxWidth ?? '1200px'} onChange={(e) => onChange({ ...s, maxWidth: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="768px">Small (768px)</option>
                    <option value="1024px">Medium (1024px)</option>
                    <option value="1200px">Large (1200px)</option>
                    <option value="1440px">XL (1440px)</option>
                    <option value="100%">Full Width</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'container',
    version: 1,
    category: 'layout',
    label: 'Container',
    icon: '⬡',
    hasChildren: true,
    defaultSettings: { maxWidth: '1200px', padding: '0 24px' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
