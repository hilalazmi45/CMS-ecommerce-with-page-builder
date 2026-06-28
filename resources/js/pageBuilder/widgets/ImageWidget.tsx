import React from 'react';

import ResponsiveImage from '@/Components/ResponsiveImage';
import type { MediaSrcset } from '@/types';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

interface ImageSettings {
    src: string;
    alt: string;
    width: string;
    align: string;
    /** Optional srcset map from the media library. */
    srcset?: MediaSrcset | null;
    /** Original image pixel width (for layout CLS prevention). */
    imageWidth?: number | null;
    /** Original image pixel height (for layout CLS prevention). */
    imageHeight?: number | null;
}

function Preview({ component }: WidgetPreviewProps) {
    const {
        src = '',
        alt = '',
        width = '100%',
        align = 'center',
        srcset,
        imageWidth,
        imageHeight,
    } = component.settings as unknown as ImageSettings;

    if (!src) {
        return (
            <div
                className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                style={{ minHeight: 120 }}
            >
                <span className="text-sm text-gray-400">Image placeholder</span>
            </div>
        );
    }

    return (
        <div className={`text-${align}`}>
            <ResponsiveImage
                url={src}
                srcset={srcset}
                width={imageWidth}
                height={imageHeight}
                alt={alt}
                style={{ width, maxWidth: '100%' }}
                className="inline-block"
            />
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as unknown as ImageSettings;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Image URL</label>
                <input
                    type="text"
                    value={s.src ?? ''}
                    onChange={(e) => onChange({ ...s, src: e.target.value, srcset: null })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="https://..."
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Alt Text</label>
                <input
                    type="text"
                    value={s.alt ?? ''}
                    onChange={(e) => onChange({ ...s, alt: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Width</label>
                <input
                    type="text"
                    value={s.width ?? '100%'}
                    onChange={(e) => onChange({ ...s, width: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="100% or 300px"
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
    type: 'image',
    version: 1,
    category: 'basic',
    label: 'Image',
    icon: '🖼',
    hasChildren: false,
    defaultSettings: { src: '', alt: '', width: '100%', align: 'center', srcset: null, imageWidth: null, imageHeight: null },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
