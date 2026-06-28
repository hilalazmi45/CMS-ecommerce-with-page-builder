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
        text = 'Click Me',
        url = '#',
        variant = 'primary',
        size = 'md',
        align = 'left',
    } = component.settings as Record<string, string>;

    const variantClasses: Record<string, string> = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
        ghost: 'text-blue-600 hover:bg-blue-50',
    };
    const sizeClasses: Record<string, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };

    const resolved = resolveTags(text, ctx);

    return (
        <div className={`text-${align}`}>
            <a
                href={url}
                className={`inline-block rounded-lg font-medium transition-colors ${variantClasses[variant] ?? variantClasses['primary']} ${sizeClasses[size] ?? sizeClasses['md']}`}
                onClick={(e) => e.preventDefault()}
            >
                {resolved}
            </a>
        </div>
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
        text = 'Click Me',
        variant = 'primary',
        size = 'md',
        align = 'left',
    } = component.settings as Record<string, string>;

    const variantClasses: Record<string, string> = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
        ghost: 'text-blue-600 hover:bg-blue-50',
    };
    const sizeClasses: Record<string, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
    };

    if (editing && onUpdateText) {
        return (
            <div className="rounded p-1 ring-2 ring-[#c2185b]">
                <div className={`text-${align}`}>
                    <span
                        ref={(el) => { editRef.current = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        className={`inline-block cursor-text rounded-lg font-medium outline-none ${variantClasses[variant] ?? variantClasses['primary']} ${sizeClasses[size] ?? sizeClasses['md']}`}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        }}
                    >
                        {text}
                    </span>
                </div>
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
    const text = s['text'] ?? 'Click Me';

    return (
        <div className="space-y-3 p-3">
            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600">
                        Button Text
                    </label>
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
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">URL</label>
                <input
                    type="text"
                    value={s['url'] ?? '#'}
                    onChange={(e) => onChange({ ...s, url: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Style</label>
                <select
                    value={s['variant'] ?? 'primary'}
                    onChange={(e) => onChange({ ...s, variant: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                    <option value="ghost">Ghost</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Size</label>
                <select
                    value={s['size'] ?? 'md'}
                    onChange={(e) => onChange({ ...s, size: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
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
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'button',
    version: 1,
    category: 'basic',
    label: 'Button',
    icon: '⬚',
    hasChildren: false,
    defaultSettings: {
        text: 'Get Started',
        url: '#',
        variant: 'primary',
        size: 'md',
        align: 'left',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
