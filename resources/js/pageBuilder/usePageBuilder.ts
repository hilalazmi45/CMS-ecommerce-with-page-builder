import { useCallback, useReducer } from 'react';
import type { PageComponent, PageSchema, ResponsiveStyles } from './types';
import { getWidget } from './registry';

interface State {
    schema: PageSchema;
    selectedId: string | null;
    history: PageSchema[];
    future: PageSchema[];
}

type Action =
    | { type: 'SELECT'; id: string | null }
    | { type: 'ADD'; component: PageComponent; parentId: string | null; index: number | null }
    | { type: 'UPDATE_SETTINGS'; id: string; settings: Record<string, unknown> }
    | { type: 'UPDATE_STYLES'; id: string; styles: ResponsiveStyles }
    | { type: 'DELETE'; id: string }
    | { type: 'DUPLICATE'; id: string }
    | { type: 'MOVE'; id: string; parentId: string | null; index: number | null }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SET_SCHEMA'; schema: PageSchema };

// ─── Tree helpers (immutable) ─────────────────────────────────────────────────
function mapComponents(components: PageComponent[], fn: (c: PageComponent) => PageComponent): PageComponent[] {
    return components.map((c) =>
        fn({ ...c, children: c.children ? mapComponents(c.children, fn) : c.children }),
    );
}

function removeNode(components: PageComponent[], id: string): [PageComponent[], PageComponent | null] {
    let removed: PageComponent | null = null;
    const walk = (list: PageComponent[]): PageComponent[] => {
        const result: PageComponent[] = [];
        for (const c of list) {
            if (c.id === id) {
                removed = c;
                continue;
            }
            result.push({ ...c, children: c.children ? walk(c.children) : c.children });
        }
        return result;
    };
    return [walk(components), removed];
}

function insertNode(
    components: PageComponent[],
    node: PageComponent,
    parentId: string | null,
    index: number | null,
): PageComponent[] {
    if (parentId === null) {
        const copy = [...components];
        copy.splice(index ?? copy.length, 0, node);
        return copy;
    }
    return components.map((c) => {
        if (c.id === parentId) {
            const children = [...(c.children ?? [])];
            children.splice(index ?? children.length, 0, node);
            return { ...c, children };
        }
        return { ...c, children: c.children ? insertNode(c.children, node, parentId, index) : c.children };
    });
}

function findNode(components: PageComponent[], id: string): PageComponent | null {
    for (const c of components) {
        if (c.id === id) return c;
        if (c.children) {
            const found = findNode(c.children, id);
            if (found) return found;
        }
    }
    return null;
}

// Exported so clipboard.ts and Editor can reuse the same ID-generation logic.
export function cloneWithNewIds(node: PageComponent): PageComponent {
    const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
        ...node,
        id: newId,
        children: node.children ? node.children.map(cloneWithNewIds) : node.children,
    };
}

// Guard against dropping a container into itself or its descendants.
function isDescendant(node: PageComponent, maybeChildId: string): boolean {
    if (node.id === maybeChildId) return true;
    return (node.children ?? []).some((c) => isDescendant(c, maybeChildId));
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function withHistory(state: State, schema: PageSchema, extra: Partial<State> = {}): State {
    return { ...state, schema, history: [...state.history, state.schema], future: [], ...extra };
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SELECT':
            return { ...state, selectedId: action.id };

        case 'ADD': {
            const components = insertNode(state.schema.components, action.component, action.parentId, action.index);
            return withHistory(state, { ...state.schema, components }, { selectedId: action.component.id });
        }

        case 'UPDATE_SETTINGS': {
            const components = mapComponents(state.schema.components, (c) =>
                c.id === action.id ? { ...c, settings: action.settings } : c,
            );
            return withHistory(state, { ...state.schema, components });
        }

        case 'UPDATE_STYLES': {
            const components = mapComponents(state.schema.components, (c) =>
                c.id === action.id ? { ...c, styles: action.styles } : c,
            );
            return withHistory(state, { ...state.schema, components });
        }

        case 'DELETE': {
            const [components] = removeNode(state.schema.components, action.id);
            return withHistory(state, { ...state.schema, components }, { selectedId: null });
        }

        case 'DUPLICATE': {
            const node = findNode(state.schema.components, action.id);
            if (!node) return state;
            const clone = cloneWithNewIds(node);
            // Insert right after the original at the same level.
            const [stripped] = removeNode(state.schema.components, action.id);
            // Re-insert original then clone — simplest: rebuild by inserting clone after.
            const components = duplicateAfter(state.schema.components, action.id, clone);
            void stripped;
            return withHistory(state, { ...state.schema, components }, { selectedId: clone.id });
        }

        case 'MOVE': {
            const moving = findNode(state.schema.components, action.id);
            if (!moving) return state;
            // Don't allow dropping into self/descendant.
            if (action.parentId && isDescendant(moving, action.parentId)) return state;

            const [without, removed] = removeNode(state.schema.components, action.id);
            if (!removed) return state;
            const components = insertNode(without, removed, action.parentId, action.index);
            return withHistory(state, { ...state.schema, components }, { selectedId: action.id });
        }

        case 'UNDO': {
            if (state.history.length === 0) return state;
            const prev = state.history[state.history.length - 1]!;
            return { ...state, schema: prev, history: state.history.slice(0, -1), future: [state.schema, ...state.future] };
        }

        case 'REDO': {
            if (state.future.length === 0) return state;
            const next = state.future[0]!;
            return { ...state, schema: next, history: [...state.history, state.schema], future: state.future.slice(1) };
        }

        case 'SET_SCHEMA':
            return { ...state, schema: action.schema, history: [...state.history, state.schema], future: [], selectedId: null };

        default:
            return state;
    }
}

function duplicateAfter(components: PageComponent[], id: string, clone: PageComponent): PageComponent[] {
    const result: PageComponent[] = [];
    let inserted = false;
    for (const c of components) {
        if (c.id === id) {
            result.push(c, clone);
            inserted = true;
        } else {
            result.push({ ...c, children: c.children ? duplicateAfter(c.children, id, clone) : c.children });
        }
    }
    void inserted;
    return result;
}

// ─── Public hook ───────────────────────────────────────────────────────────────
export function buildComponent(type: string): PageComponent | null {
    const def = getWidget(type);
    if (!def) return null;
    return {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        version: def.version,
        settings: { ...def.defaultSettings },
        styles: { ...def.defaultStyles },
        children: def.hasChildren ? [] : undefined,
    };
}

export function usePageBuilder(initialSchema: PageSchema) {
    const [state, dispatch] = useReducer(reducer, {
        schema: initialSchema,
        selectedId: null,
        history: [],
        future: [],
    });

    const select = useCallback((id: string | null) => dispatch({ type: 'SELECT', id }), []);

    const addComponent = useCallback((type: string, parentId: string | null = null, index: number | null = null) => {
        const component = buildComponent(type);
        if (component) dispatch({ type: 'ADD', component, parentId, index });
    }, []);

    /**
     * Insert a pre-built PageComponent (e.g. from clipboard paste) directly.
     * The caller is responsible for ensuring IDs are fresh (use cloneWithNewIds).
     */
    const pasteComponent = useCallback((component: PageComponent, parentId: string | null = null, index: number | null = null) => {
        dispatch({ type: 'ADD', component, parentId, index });
    }, []);

    const moveComponent = useCallback((id: string, parentId: string | null, index: number | null) => {
        dispatch({ type: 'MOVE', id, parentId, index });
    }, []);

    const duplicateComponent = useCallback((id: string) => dispatch({ type: 'DUPLICATE', id }), []);
    const updateSettings = useCallback((id: string, settings: Record<string, unknown>) => dispatch({ type: 'UPDATE_SETTINGS', id, settings }), []);
    const updateStyles = useCallback((id: string, styles: ResponsiveStyles) => dispatch({ type: 'UPDATE_STYLES', id, styles }), []);
    const deleteComponent = useCallback((id: string) => dispatch({ type: 'DELETE', id }), []);
    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const setSchema = useCallback((schema: PageSchema) => dispatch({ type: 'SET_SCHEMA', schema }), []);

    const selectedComponent = state.selectedId ? findNode(state.schema.components, state.selectedId) : null;

    return {
        schema: state.schema,
        selectedId: state.selectedId,
        selectedComponent,
        canUndo: state.history.length > 0,
        canRedo: state.future.length > 0,
        select,
        addComponent,
        pasteComponent,
        moveComponent,
        duplicateComponent,
        updateSettings,
        updateStyles,
        deleteComponent,
        undo,
        redo,
        setSchema,
    };
}

export { findNode };
