import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function getEmbedUrl(url: string): string {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
}

function Preview({ component }: WidgetPreviewProps) {
    const { url = '', aspectRatio = '16/9' } = component.settings as Record<string, string>;
    if (!url) {
        return (
            <div className="flex items-center justify-center rounded-lg bg-gray-900" style={{ aspectRatio }}>
                <span className="text-4xl">▶</span>
            </div>
        );
    }
    return (
        <div style={{ position: 'relative', aspectRatio, background: '#000' }}>
            <iframe src={getEmbedUrl(url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} allowFullScreen title="Video" />
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">YouTube / Vimeo URL</label>
                <input type="text" value={s.url ?? ''} onChange={(e) => onChange({ ...s, url: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600">Aspect Ratio</label>
                <select value={s.aspectRatio ?? '16/9'} onChange={(e) => onChange({ ...s, aspectRatio: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="16/9">16:9</option>
                    <option value="4/3">4:3</option>
                    <option value="1/1">1:1</option>
                    <option value="9/16">9:16</option>
                </select>
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'video',
    version: 1,
    category: 'basic',
    label: 'Video',
    icon: '▶',
    hasChildren: false,
    defaultSettings: { url: '', aspectRatio: '16/9' },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
