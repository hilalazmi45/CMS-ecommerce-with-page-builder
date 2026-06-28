import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const {
        text = '© 2026 Senheng. All rights reserved.',
        align = 'center',
    } = component.settings as Record<string, string>;

    return (
        <div className={`wd-copyright text-sm text-gray-500 text-${align}`}>
            {text}
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
                <label className="block text-xs font-medium text-gray-600">Copyright Text</label>
                <input
                    type="text"
                    value={s.text ?? '© 2026 Senheng. All rights reserved.'}
                    onChange={(e) => onChange({ ...s, text: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alignment</label>
                <select
                    value={s.align ?? 'center'}
                    onChange={(e) => onChange({ ...s, align: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'copyright',
    version: 1,
    category: 'layout',
    label: 'Copyright Bar',
    icon: '©',
    hasChildren: false,
    defaultSettings: {
        text: '© 2026 Senheng Electric (KL) Sdn Bhd. All rights reserved.',
        align: 'center',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
