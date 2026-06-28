import { useCallback, useRef, useState } from 'react';
import { registerWidget } from '../registry';
import { resolveTags, useDynamicTagContext } from '../dynamicTags';
import { TagPickerButton } from '../dynamicTags/TagPickerButton';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';

function Preview({ component }: WidgetPreviewProps) {
    const ctx = useDynamicTagContext();
    const {
        text = 'Text block',
        align = 'left',
        color = '',
    } = component.settings as Record<string, string>;

    // Resolve dynamic tags before rendering HTML — tags may appear inside
    // HTML-formatted content so we resolve at the string level.
    const resolved = resolveTags(text, ctx);

    return (
        <p
            className={`text-base leading-relaxed text-${align}`}
            style={{ color }}
            dangerouslySetInnerHTML={{ __html: resolved }}
        />
    );
}

function Editor({ component, isSelected, onSelect, onUpdateText }: WidgetEditorProps) {
    const [editing, setEditing] = useState(false);
    const editRef = useRef<HTMLElement | null>(null);
    const originalRef = useRef<string>('');

    const startEdit = useCallback(() => {
        if (!onUpdateText) return;
        originalRef.current = (component.settings['text'] as string | undefined) ?? '';
        setEditing(true);
    }, [onUpdateText, component.settings]);

    const commitEdit = useCallback(() => {
        if (!onUpdateText || !editRef.current) return;
        const value = editRef.current.textContent ?? '';
        onUpdateText('text', value);
        setEditing(false);
    }, [onUpdateText]);

    const cancelEdit = useCallback(() => {
        if (editRef.current) {
            editRef.current.textContent = originalRef.current;
        }
        setEditing(false);
    }, []);

    const {
        align = 'left',
        color = '',
        text = '',
    } = component.settings as Record<string, string>;

    if (editing && onUpdateText) {
        return (
            <div className="rounded p-1 ring-2 ring-[#c2185b]">
                <p
                    ref={(el) => { editRef.current = el; }}
                    contentEditable
                    suppressContentEditableWarning
                    className={`text-base leading-relaxed text-${align} outline-none`}
                    style={{ color }}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    }}
                >
                    {text}
                </p>
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            onDoubleClick={onUpdateText ? (e) => { e.stopPropagation(); startEdit(); } : undefined}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
            title={onUpdateText && isSelected ? 'Double-click to edit text' : undefined}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    const text = s['text'] ?? '';

    return (
        <div className="space-y-3 p-3">
            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600">Text</label>
                    <TagPickerButton
                        value={text}
                        onChange={(val) => onChange({ ...s, text: val })}
                    />
                </div>
                <textarea
                    value={text}
                    onChange={(e) => onChange({ ...s, text: e.target.value })}
                    rows={5}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">
                    Use {'{'}tag{'}'} tokens like {'{site.name}'} for dynamic content.
                </p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alignment</label>
                <select
                    value={s['align'] ?? 'left'}
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
    type: 'text',
    version: 1,
    category: 'basic',
    label: 'Text',
    icon: 'T',
    hasChildren: false,
    defaultSettings: {
        text: 'Add your text content here. Click to edit.',
        align: 'left',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
