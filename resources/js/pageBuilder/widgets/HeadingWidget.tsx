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
        text = 'Heading',
        tag = 'h2',
        align = 'left',
        color = '',
    } = component.settings as Record<string, string>;

    const Tag = tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    const sizeMap: Record<string, string> = {
        h1: 'text-4xl',
        h2: 'text-3xl',
        h3: 'text-2xl',
        h4: 'text-xl',
        h5: 'text-lg',
        h6: 'text-base',
    };

    const resolved = resolveTags(text, ctx);

    return (
        <Tag
            className={`font-bold ${sizeMap[tag] ?? 'text-2xl'} text-${align}`}
            style={{ color }}
        >
            {resolved}
        </Tag>
    );
}

function Editor({ component, isSelected, onSelect, onUpdateText }: WidgetEditorProps) {
    const [editing, setEditing] = useState(false);
    const editRef = useRef<HTMLElement | null>(null);
    // Track the original text so Escape can cancel
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
        tag = 'h2',
        align = 'left',
        color = '',
        text = 'Heading',
    } = component.settings as Record<string, string>;

    const sizeMap: Record<string, string> = {
        h1: 'text-4xl',
        h2: 'text-3xl',
        h3: 'text-2xl',
        h4: 'text-xl',
        h5: 'text-lg',
        h6: 'text-base',
    };

    const Tag = tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    if (editing && onUpdateText) {
        return (
            <div className="rounded p-1 ring-2 ring-[#c2185b]">
                <Tag
                    ref={(el) => { editRef.current = el; }}
                    contentEditable
                    suppressContentEditableWarning
                    className={`font-bold ${sizeMap[tag] ?? 'text-2xl'} text-${align} outline-none`}
                    style={{ color }}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    }}
                    // Using textContent only — no innerHTML
                    dangerouslySetInnerHTML={undefined}
                >
                    {text}
                </Tag>
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
    const text = s['text'] ?? 'Heading';

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
                <input
                    type="text"
                    value={text}
                    onChange={(e) => onChange({ ...s, text: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">
                    Use {'{'}tag{'}'} tokens like {'{product.title}'} for dynamic content.
                </p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Tag</label>
                <select
                    value={s['tag'] ?? 'h2'}
                    onChange={(e) => onChange({ ...s, tag: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    {['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((t) => (
                        <option key={t} value={t}>
                            {t.toUpperCase()}
                        </option>
                    ))}
                </select>
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
            <div>
                <label className="block text-xs font-medium text-gray-600">Color</label>
                <input
                    type="color"
                    value={s['color'] ?? '#111827'}
                    onChange={(e) => onChange({ ...s, color: e.target.value })}
                    className="mt-1 h-8 w-full rounded border border-gray-300 px-1"
                />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'heading',
    version: 1,
    category: 'basic',
    label: 'Heading',
    icon: 'H',
    hasChildren: false,
    defaultSettings: {
        text: 'Add Your Heading',
        tag: 'h2',
        align: 'left',
        color: '#111827',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
