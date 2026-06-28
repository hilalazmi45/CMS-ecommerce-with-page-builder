import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    PointerSensor, KeyboardSensor, useSensor, useSensors, pointerWithin,
    useDraggable, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePage } from '@inertiajs/react';
import { getAllWidgets, getWidget, getWidgetsByCategory } from '@/pageBuilder/registry';
import { usePageBuilder, findNode } from '@/pageBuilder/usePageBuilder';
import { runMigrations } from '@/pageBuilder/migrations/runMigrations';
import type { ComponentStyle, PageComponent, PageSchema, ResponsiveStyles, WidgetDefinition } from '@/pageBuilder/types';
import type { DesignSystemTokens, PageProps } from '@/types';
import '@/pageBuilder/registerAll';
import {
    filterWidgets,
    loadCollapsedCategories,
    loadFavorites,
    saveCollapsedCategories,
    saveFavorites,
    toggleFavorite,
} from '@/pageBuilder/widgetSearch';
import {
    cloneWithNewIds,
    readComponentFromClipboard,
    writeComponentToClipboard,
} from '@/pageBuilder/clipboard';
import { Copy, Trash2, GripVertical, History, Monitor, Tablet, Smartphone, Undo2, Redo2, X, RotateCcw, Eye, Settings2, Palette, SlidersHorizontal, ListTree, ChevronRight, ChevronDown, Star, EyeOff, Lock, Unlock, Search, LayoutTemplate, Save, Trash } from 'lucide-react';
import { StyleControls, AdvancedControls } from './StyleControls';

interface BuilderDocument {
    type: string;
    id: string;
    title: string;
    content: PageSchema;
    saveUrl: string;
    revisionsUrl: string;
    restoreUrl: string;
    backUrl: string;
}

interface Props { document: BuilderDocument }

const CATEGORY_ORDER: WidgetDefinition['category'][] = ['layout', 'basic', 'content', 'commerce', 'form'];
const CATEGORY_LABELS: Record<string, string> = { layout: 'Layout', basic: 'Basic', content: 'Content', commerce: 'WooCommerce', form: 'Form' };

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };

const ACCENT = '#c2185b';

function locate(components: PageComponent[], id: string, parentId: string | null = null): { parentId: string | null; index: number } | null {
    for (let i = 0; i < components.length; i++) {
        const c = components[i]!;
        if (c.id === id) return { parentId, index: i };
        if (c.children) {
            const found = locate(c.children, id, c.id);
            if (found) return found;
        }
    }
    return null;
}

function csrf(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

// ─── Palette item (draggable, Elementor tile) ──────────────────────────────────
function PaletteItem({ def, onAdd, isFavorite, onToggleFavorite }: {
    def: WidgetDefinition;
    onAdd: () => void;
    isFavorite: boolean;
    onToggleFavorite: (type: string) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `palette:${def.type}`,
        data: { kind: 'palette', widgetType: def.type },
    });
    return (
        <div className="relative group">
            <button
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                onClick={onAdd}
                className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-[#34363f] bg-[#2a2c37] px-2 py-3 text-center transition-all hover:border-[#c2185b] hover:bg-[#32343f] ${isDragging ? 'opacity-40' : ''}`}
                title={`Add ${def.label}`}
            >
                <span className="text-lg leading-none text-[#a4afb7] transition-colors group-hover:text-white">{def.icon}</span>
                <span className="text-[11px] leading-tight text-[#a4afb7] transition-colors group-hover:text-white">{def.label}</span>
            </button>
            {/* Favorites star — visible on hover or when favorited */}
            <button
                type="button"
                aria-pressed={isFavorite}
                aria-label={isFavorite ? `Remove ${def.label} from favorites` : `Add ${def.label} to favorites`}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(def.type); }}
                className={`absolute right-0.5 top-0.5 rounded p-0.5 transition-colors ${isFavorite ? 'text-yellow-400 opacity-100' : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-yellow-400'}`}
            >
                <Star size={10} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
        </div>
    );
}

// ─── Drop zone ──────────────────────────────────────────────────────────────────
function DropZone({ parentId, items, render, empty, containerStyle }: {
    parentId: string | null;
    items: PageComponent[];
    render: (c: PageComponent) => React.ReactNode;
    empty?: string;
    containerStyle?: React.CSSProperties;
}) {
    const zoneId = `zone:${parentId ?? 'root'}`;
    const { setNodeRef, isOver } = useDroppable({ id: zoneId, data: { kind: 'zone', parentId } });
    // When a layout widget supplies a container style (e.g. a grid), apply it so
    // the canvas mirrors the real layout. Only do so once there are children.
    const layoutStyle = items.length > 0 ? containerStyle : undefined;
    return (
        <div ref={setNodeRef} style={layoutStyle} className={`min-h-[40px] rounded transition-colors ${isOver ? 'bg-pink-50 outline-dashed outline-2 outline-[#c2185b]' : ''}`}>
            <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {items.map(render)}
            </SortableContext>
            {items.length === 0 && (
                <div className="flex h-16 items-center justify-center text-xs text-gray-300">{empty ?? 'Drop widgets here'}</div>
            )}
        </div>
    );
}

// ─── Canvas node (sortable + recursive, applies user styles) ───────────────────
function CanvasNode({ component, selectedId, device, onSelect, onDelete, onDuplicate, onUpdateSettings }: {
    component: PageComponent;
    selectedId: string | null;
    device: Device;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onUpdateSettings: (id: string, settings: Record<string, unknown>) => void;
}) {
    const isHidden = component.settings._hidden === true;
    const isLocked = component.settings._locked === true;

    // A6: locked components cannot be dragged on the canvas.
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: component.id,
        data: { kind: 'component' },
        disabled: isLocked,
    });
    const def = getWidget(component.type);
    const EditorComp = def?.EditorComponent;

    // A7: inline text editing callback — must be declared before any early return (Rules of Hooks)
    const handleUpdateText = useCallback((key: string, value: string) => {
        onUpdateSettings(component.id, { ...component.settings, [key]: value });
    }, [component.id, component.settings, onUpdateSettings]);

    const handleSelect = useCallback(() => {
        // A6: locked components cannot be selected from canvas click
        if (isLocked) return;
        onSelect(component.id);
    }, [component.id, isLocked, onSelect]);

    // Unknown widget type — render nothing (unknown-widget fallback is in PageRenderer for the storefront)
    if (!def || !EditorComp) return null;

    const selected = selectedId === component.id;

    // Apply the resolved style for the active device (mobile inherits tablet/desktop, etc.).
    const userStyle = resolvedDeviceStyle(component, device) as React.CSSProperties;
    const cssId = (component.settings._cssId as string) || undefined;
    const cssClass = (component.settings._cssClass as string) || '';

    const style: React.CSSProperties = {
        ...userStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : isHidden ? 0.35 : 1,
    };

    return (
        <div ref={setNodeRef} id={cssId} data-cid={component.id} style={style} className={`group relative my-0.5 ${cssClass}`}>
            {/* A6: hidden indicator overlay */}
            {isHidden && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded bg-gray-500/10">
                    <span className="rounded bg-gray-700/70 px-1.5 py-0.5 text-[10px] text-gray-300"><EyeOff size={10} className="inline mr-0.5" />Hidden</span>
                </div>
            )}
            <div className={`pointer-events-none absolute inset-0 z-10 rounded transition-all ${selected ? 'ring-2 ring-[#c2185b]' : 'ring-1 ring-transparent group-hover:ring-[#c2185b]/40'}`} />
            <div className={`absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-md bg-[#c2185b] px-1 py-0.5 text-white shadow-md transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {/* Drag handle — disabled for locked components */}
                {!isLocked && <button {...attributes} {...listeners} className="cursor-grab rounded px-0.5 hover:bg-white/20" title="Drag"><GripVertical size={13} /></button>}
                {isLocked && <span className="rounded px-0.5 text-gray-300" title="Locked — unlock in Structure panel"><Lock size={13} /></span>}
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(component.id); }} className="rounded px-0.5 hover:bg-white/20" title="Duplicate"><Copy size={13} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(component.id); }} className="rounded px-0.5 hover:bg-white/20" title="Delete"><Trash2 size={13} /></button>
            </div>

            <EditorComp
                component={component}
                isSelected={selected}
                onSelect={handleSelect}
                onUpdateText={handleUpdateText}
            >
                {def.hasChildren && (
                    <DropZone
                        parentId={component.id}
                        items={component.children ?? []}
                        empty="+ Drag widgets inside"
                        containerStyle={def.getChildrenContainerStyle?.(component, device)}
                        render={(child) => (
                            <CanvasNode
                                key={child.id}
                                component={child}
                                selectedId={selectedId}
                                device={device}
                                onSelect={onSelect}
                                onDelete={onDelete}
                                onDuplicate={onDuplicate}
                                onUpdateSettings={onUpdateSettings}
                            />
                        )}
                    />
                )}
            </EditorComp>
        </div>
    );
}

// Merge desktop → tablet → mobile so each device inherits the larger breakpoint.
function resolvedDeviceStyle(component: PageComponent, device: Device): ComponentStyle {
    const s = (component.styles ?? {});
    const desktop = (s.desktop ?? {});
    if (device === 'tablet') return { ...desktop, ...(s.tablet ?? {}) };
    if (device === 'mobile') return { ...desktop, ...(s.tablet ?? {}), ...(s.mobile ?? {}) };
    return desktop;
}

// StyleControls and AdvancedControls are imported from ./StyleControls

// ─── Settings sidebar with tabs ──────────────────────────────────────────────────
type Tab = 'content' | 'style' | 'advanced';

function SettingsSidebar({ component, device, updateSettings, updateStyles, onClose, designSystem }: {
    component: PageComponent | null;
    device: Device;
    updateSettings: (id: string, s: Record<string, unknown>) => void;
    updateStyles: (id: string, s: ResponsiveStyles) => void;
    onClose: () => void;
    designSystem?: DesignSystemTokens;
}) {
    const [tab, setTab] = useState<Tab>('content');
    if (!component) {
        return (
            <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
                <div className="flex h-11 items-center border-b border-gray-200 px-4 text-sm font-semibold text-gray-700">Edit</div>
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-400">
                    <Settings2 size={28} className="text-gray-300" />
                    Select a widget on the canvas to edit its Content, Style &amp; Advanced settings.
                </div>
            </aside>
        );
    }
    const def = getWidget(component.type)!;
    const Panel = def.SettingsPanel;
    const TabBtn = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => (
        <button onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-xs font-medium transition-colors ${tab === id ? 'border-[#c2185b] text-[#c2185b]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {icon}{label}
        </button>
    );

    return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
            <div className="flex h-11 items-center justify-between border-b border-gray-200 px-4">
                <span className="truncate text-sm font-semibold text-gray-800">{def.label}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>
            <div className="flex border-b border-gray-200">
                <TabBtn id="content" label="Content" icon={<Settings2 size={13} />} />
                <TabBtn id="style" label="Style" icon={<Palette size={13} />} />
                <TabBtn id="advanced" label="Advanced" icon={<SlidersHorizontal size={13} />} />
            </div>
            <div className="flex-1 overflow-y-auto">
                {tab === 'content' && <Panel component={component} onChange={(s) => updateSettings(component.id, s)} onStyleChange={(s) => updateStyles(component.id, s)} />}
                {tab === 'style' && <StyleControls component={component} device={device} onStyleChange={(s) => updateStyles(component.id, s)} designSystem={designSystem} />}
                {tab === 'advanced' && <AdvancedControls component={component} onChange={(s) => updateSettings(component.id, s)} />}
            </div>
        </aside>
    );
}

// ─── Revision history ─────────────────────────────────────────────────────────────
interface RevisionRow { id: number; label: string | null; is_published: boolean; author: string | null; created_at: string; component_count: number }
interface RevisionsResponse { revisions: RevisionRow[] }
interface RestoreResponse { ok: boolean; content: PageSchema }

function RevisionPanel({ doc, onClose, onRestore }: { doc: BuilderDocument; onClose: () => void; onRestore: (content: PageSchema) => void }) {
    const [rows, setRows] = useState<RevisionRow[] | null>(null);
    useEffect(() => {
        void fetch(doc.revisionsUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json() as Promise<RevisionsResponse>)
            .then((d) => setRows(d.revisions));
    }, [doc.revisionsUrl]);

    async function restore(id: number) {
        if (!confirm('Restore this revision? Current unsaved state will be replaced.')) return;
        const res = await fetch(doc.restoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ revision_id: id }),
        });
        const data = await res.json() as RestoreResponse;
        if (data.ok) { onRestore(data.content); onClose(); }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
            <div className="flex h-full w-96 flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><History size={16} /> Revision History</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {rows === null && <div className="p-6 text-center text-sm text-gray-400">Loading…</div>}
                    {rows?.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No revisions yet. Save to create one.</div>}
                    {rows?.map((rev) => (
                        <div key={rev.id} className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3 hover:bg-gray-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{rev.label ?? 'Revision'}</span>
                                    {rev.is_published && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Published</span>}
                                </div>
                                <div className="mt-0.5 text-xs text-gray-400">{new Date(rev.created_at).toLocaleString()} · {rev.component_count} blocks{rev.author ? ` · ${rev.author}` : ''}</div>
                            </div>
                            <button onClick={() => { void restore(rev.id); }} className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-[#c2185b] hover:text-[#c2185b]"><RotateCcw size={12} /> Restore</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Structure / Navigator panel ────────────────────────────────────────────────
function nodeLabel(component: PageComponent): string {
    const custom = (component.settings._label as string)?.trim();
    if (custom) return custom;
    return getWidget(component.type)?.label ?? component.type;
}

interface StructureNodeProps {
    component: PageComponent;
    depth: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
    collapsed: Set<string>;
    toggleCollapse: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleHidden: (id: string) => void;
    onToggleLocked: (id: string) => void;
}

function StructureNode({
    component, depth, selectedId, onSelect, collapsed, toggleCollapse,
    onDuplicate, onDelete, onToggleHidden, onToggleLocked,
}: StructureNodeProps) {
    const def = getWidget(component.type);
    const children = component.children ?? [];
    const hasChildren = children.length > 0;
    const isOpen = !collapsed.has(component.id);
    const selected = selectedId === component.id;
    const isHidden = component.settings._hidden === true;
    const isLocked = component.settings._locked === true;

    return (
        <div>
            <div
                role="treeitem"
                aria-selected={selected}
                onClick={() => onSelect(component.id)}
                className={`group flex cursor-pointer items-center gap-1 rounded px-1 py-1 text-[13px] ${selected ? 'bg-[#c2185b]/20 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                style={{ paddingLeft: 8 + depth * 14 }}
                title={component.type}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(component.id); }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-400 hover:text-white"
                    >
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                ) : (
                    <span className="h-4 w-4 shrink-0" />
                )}
                <span className={`shrink-0 text-sm leading-none ${isHidden ? 'text-gray-600' : 'text-gray-400'}`}>{def?.icon ?? '▫'}</span>
                <span className={`flex-1 truncate ${isHidden ? 'text-gray-500 line-through' : ''}`}>{nodeLabel(component)}</span>

                {/* Per-node action buttons — visible on hover/selection */}
                <div className={`flex items-center gap-0.5 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                        type="button"
                        aria-label={isHidden ? 'Show component' : 'Hide component'}
                        onClick={(e) => { e.stopPropagation(); onToggleHidden(component.id); }}
                        className={`rounded p-0.5 transition-colors hover:text-white ${isHidden ? 'text-gray-500' : 'text-gray-400'}`}
                        title={isHidden ? 'Show' : 'Hide'}
                    >
                        <EyeOff size={12} />
                    </button>
                    <button
                        type="button"
                        aria-label={isLocked ? 'Unlock component' : 'Lock component'}
                        onClick={(e) => { e.stopPropagation(); onToggleLocked(component.id); }}
                        className={`rounded p-0.5 transition-colors hover:text-white ${isLocked ? 'text-yellow-400' : 'text-gray-400'}`}
                        title={isLocked ? 'Unlock' : 'Lock'}
                    >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <button
                        type="button"
                        aria-label="Duplicate component"
                        onClick={(e) => { e.stopPropagation(); onDuplicate(component.id); }}
                        className="rounded p-0.5 text-gray-400 transition-colors hover:text-white"
                        title="Duplicate"
                    >
                        <Copy size={12} />
                    </button>
                    <button
                        type="button"
                        aria-label="Delete component"
                        onClick={(e) => { e.stopPropagation(); onDelete(component.id); }}
                        className="rounded p-0.5 text-gray-400 transition-colors hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            {hasChildren && isOpen && (
                <div role="group">
                    {children.map((child) => (
                        <StructureNode
                            key={child.id}
                            component={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            collapsed={collapsed}
                            toggleCollapse={toggleCollapse}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onToggleHidden={onToggleHidden}
                            onToggleLocked={onToggleLocked}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface StructurePanelProps {
    components: PageComponent[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onClose: () => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onToggleHidden: (id: string) => void;
    onToggleLocked: (id: string) => void;
}

function StructurePanel({ components, selectedId, onSelect, onClose, onDuplicate, onDelete, onToggleHidden, onToggleLocked }: StructurePanelProps) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const toggleCollapse = (id: string) => setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        return next;
    });
    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-black/30 bg-[#1e1f26]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-black/30 px-3">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-200"><ListTree size={15} /> Structure</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5" role="tree" aria-label="Page structure">
                {components.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">No widgets yet.</div>
                ) : (
                    components.map((c) => (
                        <StructureNode
                            key={c.id}
                            component={c}
                            depth={0}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            collapsed={collapsed}
                            toggleCollapse={toggleCollapse}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onToggleHidden={onToggleHidden}
                            onToggleLocked={onToggleLocked}
                        />
                    ))
                )}
            </div>
        </aside>
    );
}

// ─── A9: Templates panel ──────────────────────────────────────────────────────────

interface TemplateMeta {
    ulid: string;
    name: string;
    type: string;
    is_global: boolean;
    created_at: string;
    component_count: number;
    content: { schemaVersion: number; components: PageComponent[] };
}

interface TemplatesResponse { templates: TemplateMeta[] }
interface TemplateSaveResponse { ok: boolean; ulid: string; name: string }

function TemplatesPanel({
    schema,
    selectedId,
    onInsert,
    onClose,
    saveUrl,
}: {
    schema: PageComponent[];
    selectedId: string | null;
    onInsert: (components: PageComponent[], afterId: string | null) => void;
    onClose: () => void;
    saveUrl: string;
}) {
    const [templates, setTemplates] = useState<TemplateMeta[] | null>(null);
    const [saveName, setSaveName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Derive the template index URL from saveUrl (e.g. /admin/builder/page/xxx/save → /admin/builder/templates)
    const templatesUrl = saveUrl.replace(/\/builder\/[^/]+\/[^/]+\/save$/, '/builder/templates');

    useEffect(() => {
        void fetch(templatesUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json() as Promise<TemplatesResponse>)
            .then((d) => setTemplates(d.templates))
            .catch(() => setTemplates([]));
    }, [templatesUrl]);

    function handleInsert(tpl: TemplateMeta) {
        const cloned = tpl.content.components.map(cloneWithNewIds);
        onInsert(cloned, selectedId);
        onClose();
    }

    async function handleSave() {
        if (!saveName.trim()) { setError('Name is required.'); return; }
        setError(null);
        setSaving(true);
        try {
            const res = await fetch(templatesUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    name: saveName.trim(),
                    type: 'section',
                    content: { schemaVersion: 1, components: schema },
                    is_global: false,
                }),
            });
            const data = await res.json() as TemplateSaveResponse;
            if (data.ok) {
                setSaveName('');
                // Refresh list
                const r2 = await fetch(templatesUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
                const d2 = await r2.json() as TemplatesResponse;
                setTemplates(d2.templates);
            }
        } catch {
            setError('Failed to save template.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(ulid: string) {
        if (!confirm('Delete this template?')) return;
        await fetch(`${templatesUrl}/${ulid}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest' },
        });
        setTemplates((prev) => prev?.filter((t) => t.ulid !== ulid) ?? prev);
    }

    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-black/30 bg-[#1e1f26]">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-black/30 px-3">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-200">
                    <LayoutTemplate size={15} /> Templates
                </span>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={15} /></button>
            </div>

            {/* Save current page as template */}
            <div className="border-b border-black/30 px-3 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Save as template
                </p>
                <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Template name…"
                    className="w-full rounded bg-[#2a2c37] px-2 py-1.5 text-[12px] text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-[#c2185b]"
                />
                {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => { void handleSave(); }}
                    className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-[#c2185b] px-2 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                >
                    <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                </button>
            </div>

            {/* List templates */}
            <div className="flex-1 overflow-y-auto p-2">
                {templates === null && <p className="py-4 text-center text-[12px] text-gray-500">Loading…</p>}
                {templates?.length === 0 && <p className="py-4 text-center text-[12px] text-gray-500">No templates yet.</p>}
                {templates?.map((tpl) => (
                    <div key={tpl.ulid} className="mb-1.5 rounded bg-[#2a2c37] px-2 py-1.5">
                        <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                                <p className="truncate text-[12px] font-medium text-gray-200">{tpl.name}</p>
                                <p className="text-[10px] text-gray-500">
                                    {tpl.component_count} block{tpl.component_count !== 1 ? 's' : ''}
                                    {tpl.is_global && ' · Global'}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    title="Insert template"
                                    onClick={() => { void handleInsert(tpl); }}
                                    className="rounded px-1.5 py-1 text-[11px] font-medium text-[#c2185b] hover:bg-[#c2185b] hover:text-white"
                                >
                                    Use
                                </button>
                                <button
                                    type="button"
                                    title="Delete template"
                                    onClick={() => { void handleDelete(tpl.ulid); }}
                                    className="rounded p-1 text-gray-500 hover:text-red-400"
                                >
                                    <Trash size={11} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

// ─── Main editor ──────────────────────────────────────────────────────────────────
export default function PageBuilderEditor({ document: doc }: Props) {
    // A4: pull design tokens from Inertia shared props (lazily resolved by middleware)
    const { designSystem } = usePage<PageProps>().props;

    const {
        schema, selectedId, selectedComponent, canUndo, canRedo,
        select, addComponent, pasteComponent, moveComponent, duplicateComponent,
        updateSettings, updateStyles, deleteComponent, undo, redo, setSchema,
    } = usePageBuilder(
        useMemo(
            () => runMigrations(doc.content?.components ? doc.content : { schemaVersion: 1, components: [] }),
            [doc.content],
        ),
    );

    const [activeDrag, setActiveDrag] = useState<{ kind: string; label: string } | null>(null);
    const [device, setDevice] = useState<Device>('desktop');
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showRevisions, setShowRevisions] = useState(false);
    const [preview, setPreview] = useState(false);
    const [showStructure, setShowStructure] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    // ── A1: Search + Favorites + Category collapse ─────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => loadCollapsedCategories());

    // ── A8: Copy/paste toast ───────────────────────────────────────────────────
    const [pasteToast, setPasteToast] = useState(false);

    // Select a component from the Structure tree and scroll the canvas to it.
    const selectAndReveal = useCallback((id: string) => {
        select(id);
        requestAnimationFrame(() => {
            document.querySelector(`[data-cid="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }, [select]);

    // ── A1: Favorites toggle (persists to localStorage) ───────────────────────
    const handleToggleFavorite = useCallback((type: string) => {
        setFavorites((prev) => {
            const next = toggleFavorite(prev, type);
            saveFavorites(next);
            return next;
        });
    }, []);

    // ── A1: Category collapse toggle (persists to localStorage) ───────────────
    const handleToggleCategory = useCallback((cat: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
            saveCollapsedCategories(next);
            return next;
        });
    }, []);

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstRender = useRef(true);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const doSave = useCallback(async (publish: boolean) => {
        setSaving(true);
        try {
            await fetch(doc.saveUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ content: schema, publish }),
            });
            setLastSaved(new Date());
        } finally {
            setSaving(false);
        }
    }, [schema, doc.saveUrl]);

    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => { void doSave(false); }, 2500);
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, [schema, doSave]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Guard: do not fire shortcuts while the user is typing in an input/textarea/contentEditable
            const target = e.target;
            const isEditing = target instanceof HTMLElement && (
                target.isContentEditable ||
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
            );

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                if (isEditing) return;
                e.preventDefault(); undo();
            }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                if (isEditing) return;
                e.preventDefault(); redo();
            }

            // ── A8: Copy (Ctrl/Cmd+C) ─────────────────────────────────────
            if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !isEditing && selectedComponent) {
                e.preventDefault();
                void writeComponentToClipboard(selectedComponent);
            }

            // ── A8: Paste (Ctrl/Cmd+V) ────────────────────────────────────
            if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !isEditing) {
                e.preventDefault();
                void readComponentFromClipboard().then((comp) => {
                    if (!comp) return;
                    const fresh = cloneWithNewIds(comp);
                    // Insert after the currently selected component (same parent level)
                    const loc = selectedId ? locate(schema.components, selectedId) : null;
                    const insertIndex = loc ? loc.index + 1 : null;
                    const insertParent = loc ? loc.parentId : null;
                    pasteComponent(fresh, insertParent, insertIndex);
                    // Show paste toast
                    setPasteToast(true);
                    setTimeout(() => setPasteToast(false), 2000);
                });
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo, selectedComponent, selectedId, schema.components, pasteComponent]);

    function handleDragStart(e: DragStartEvent) {
        const data = e.active.data.current;
        if (data?.kind === 'palette') setActiveDrag({ kind: 'palette', label: getWidget(data.widgetType as string)?.label ?? '' });
        else { const comp = e.active.id as string; setActiveDrag({ kind: 'component', label: getWidget(comp.split('-')[0]!)?.label ?? 'Block' }); }
    }

    function handleDragEnd(e: DragEndEvent) {
        setActiveDrag(null);
        const { active, over } = e;
        if (!over) return;
        const overId = over.id as string;
        let parentId: string | null = null;
        let index: number | null = null;
        if (overId.startsWith('zone:')) {
            const z = overId.slice(5);
            parentId = z === 'root' ? null : z;
            index = null;
        } else {
            const loc = locate(schema.components, overId);
            if (loc) { parentId = loc.parentId; index = loc.index; }
        }
        const data = active.data.current;
        if (data?.kind === 'palette') addComponent(data.widgetType as string, parentId, index);
        else { const activeId = active.id as string; if (activeId !== overId) moveComponent(activeId, parentId, index); }
    }

    return (
        <div className="flex h-screen flex-col bg-[#1e1f26] text-gray-100">
            {/* Elementor-style top bar */}
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/30 bg-[#26272d] px-3">
                <div className="flex items-center gap-3">
                    <a href={doc.backUrl} className="flex h-7 w-7 items-center justify-center rounded text-gray-300 hover:bg-white/10" title="Exit">←</a>
                    <span className="flex h-6 w-6 items-center justify-center rounded text-white" style={{ background: ACCENT }}>✱</span>
                    <div className="leading-tight">
                        <div className="text-[13px] font-medium text-white">{doc.title}</div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">{doc.type}</div>
                    </div>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-[#1e1f26] p-0.5">
                    {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([d, Icon]) => (
                        <button key={d} onClick={() => setDevice(d)} className={`rounded p-1.5 ${device === d ? 'bg-[#c2185b] text-white' : 'text-gray-400 hover:text-white'}`} title={d}><Icon size={15} /></button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</span>
                    <button onClick={() => setShowStructure((v) => !v)} className={`rounded p-1.5 ${showStructure ? 'bg-[#c2185b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`} title="Structure"><ListTree size={15} /></button>
                    <button onClick={() => { setShowTemplates((v) => !v); setShowStructure(false); }} className={`rounded p-1.5 ${showTemplates ? 'bg-[#c2185b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`} title="Templates"><LayoutTemplate size={15} /></button>
                    <button onClick={undo} disabled={!canUndo} className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30" title="Undo"><Undo2 size={15} /></button>
                    <button onClick={redo} disabled={!canRedo} className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30" title="Redo"><Redo2 size={15} /></button>
                    <button onClick={() => setPreview((p) => !p)} className={`rounded p-1.5 ${preview ? 'bg-[#c2185b] text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`} title="Preview"><Eye size={15} /></button>
                    <button onClick={() => setShowRevisions(true)} className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white" title="History"><History size={15} /></button>
                    <button onClick={() => { void doSave(false); }} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/10">Save Draft</button>
                    <button onClick={() => { void doSave(true); }} className="rounded-md px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90" style={{ background: ACCENT }}>Publish</button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* Palette */}
                    {!preview && (
                        <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-black/30 bg-[#1e1f26]">
                            {/* A1: Search input */}
                            <div className="border-b border-black/30 px-2 py-2">
                                <div className="flex items-center gap-1.5 rounded-md bg-[#2a2c37] px-2 py-1.5">
                                    <Search size={12} className="shrink-0 text-gray-500" />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search elements…"
                                        aria-label="Search widgets"
                                        className="w-full bg-transparent text-[12px] text-gray-300 placeholder-gray-600 outline-none"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            aria-label="Clear search"
                                            className="shrink-0 text-gray-500 hover:text-gray-300"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* A1: Favorites section (only when there are favorites and no active search) */}
                            {!searchQuery && favorites.size > 0 && (
                                <div className="border-b border-black/20 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleCategory('__favorites__')}
                                        className="flex w-full items-center gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-yellow-400 hover:text-yellow-300"
                                    >
                                        {collapsedCategories.has('__favorites__') ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                                        <Star size={10} fill="currentColor" />
                                        Favorites
                                    </button>
                                    {!collapsedCategories.has('__favorites__') && (
                                        <div className="grid grid-cols-3 gap-1.5 px-2">
                                            {getAllWidgets()
                                                .filter((d) => favorites.has(d.type))
                                                .map((def) => (
                                                    <PaletteItem
                                                        key={def.type}
                                                        def={def}
                                                        onAdd={() => addComponent(def.type, null, null)}
                                                        isFavorite={true}
                                                        onToggleFavorite={handleToggleFavorite}
                                                    />
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* A1: Search results (flat list, no categories) */}
                            {searchQuery ? (
                                <div className="pb-2">
                                    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Results</p>
                                    <div className="grid grid-cols-3 gap-1.5 px-2">
                                        {filterWidgets(getAllWidgets(), searchQuery).map((def) => (
                                            <PaletteItem
                                                key={def.type}
                                                def={def}
                                                onAdd={() => addComponent(def.type, null, null)}
                                                isFavorite={favorites.has(def.type)}
                                                onToggleFavorite={handleToggleFavorite}
                                            />
                                        ))}
                                    </div>
                                    {filterWidgets(getAllWidgets(), searchQuery).length === 0 && (
                                        <p className="px-3 py-2 text-[11px] text-gray-600">No elements match &ldquo;{searchQuery}&rdquo;</p>
                                    )}
                                </div>
                            ) : (
                                /* A1: Categorised list with collapsible sections */
                                CATEGORY_ORDER.filter((cat) => getWidgetsByCategory(cat).length > 0).map((cat) => (
                                    <div key={cat} className="border-b border-black/20 pb-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleCategory(cat)}
                                            className="flex w-full items-center gap-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
                                        >
                                            {collapsedCategories.has(cat) ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                                            {CATEGORY_LABELS[cat]}
                                        </button>
                                        {!collapsedCategories.has(cat) && (
                                            <div className="grid grid-cols-3 gap-1.5 px-2">
                                                {getWidgetsByCategory(cat).map((def) => (
                                                    <PaletteItem
                                                        key={def.type}
                                                        def={def}
                                                        onAdd={() => addComponent(def.type, null, null)}
                                                        isFavorite={favorites.has(def.type)}
                                                        onToggleFavorite={handleToggleFavorite}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </aside>
                    )}

                    {/* A9: Templates panel */}
                    {!preview && showTemplates && (
                        <TemplatesPanel
                            schema={schema.components}
                            selectedId={selectedId}
                            onClose={() => setShowTemplates(false)}
                            saveUrl={doc.saveUrl}
                            onInsert={(components, afterId) => {
                                // Insert each template component after the currently selected item
                                // using pasteComponent (takes a full PageComponent, respects parentId).
                                const loc = afterId ? locate(schema.components, afterId) : null;
                                components.forEach((comp, i) => {
                                    pasteComponent(
                                        comp,
                                        loc?.parentId ?? null,
                                        loc != null ? loc.index + 1 + i : null,
                                    );
                                });
                            }}
                        />
                    )}

                    {/* Structure / Navigator */}
                    {!preview && showStructure && (
                        <StructurePanel
                            components={schema.components}
                            selectedId={selectedId}
                            onSelect={selectAndReveal}
                            onClose={() => setShowStructure(false)}
                            onDuplicate={duplicateComponent}
                            onDelete={deleteComponent}
                            onToggleHidden={(id) => {
                                const node = findNode(schema.components, id);
                                if (!node) return;
                                updateSettings(id, { ...node.settings, _hidden: node.settings._hidden !== true });
                            }}
                            onToggleLocked={(id) => {
                                const node = findNode(schema.components, id);
                                if (!node) return;
                                updateSettings(id, { ...node.settings, _locked: node.settings._locked !== true });
                            }}
                        />
                    )}

                    {/* Canvas */}
                    <main className="flex-1 overflow-y-auto bg-[#2c2e36] p-6" onClick={() => select(null)}>
                        <div className="mx-auto bg-white shadow-2xl transition-all" style={{ width: DEVICE_WIDTH[device], maxWidth: '100%', minHeight: 600 }}>
                            <div className="p-2">
                                <DropZone
                                    parentId={null}
                                    items={schema.components}
                                    empty="✱ Drag elements here, or click one in the left panel"
                                    render={(component) => (
                                        <CanvasNode
                                            key={component.id}
                                            component={component}
                                            selectedId={preview ? null : selectedId}
                                            device={device}
                                            onSelect={preview ? () => {} : select}
                                            onDelete={deleteComponent}
                                            onDuplicate={duplicateComponent}
                                            onUpdateSettings={updateSettings}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </main>

                    <DragOverlay>
                        {activeDrag && (
                            <div className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-lg" style={{ background: ACCENT }}>{activeDrag.label}</div>
                        )}
                    </DragOverlay>
                </DndContext>

                {!preview && <SettingsSidebar component={selectedComponent} device={device} updateSettings={updateSettings} updateStyles={updateStyles} onClose={() => select(null)} designSystem={designSystem} />}
            </div>

            {showRevisions && <RevisionPanel doc={doc} onClose={() => setShowRevisions(false)} onRestore={(content) => setSchema(runMigrations(content))} />}

            {/* A8: Paste toast notification */}
            {pasteToast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-lg"
                >
                    Element pasted
                </div>
            )}
        </div>
    );
}
