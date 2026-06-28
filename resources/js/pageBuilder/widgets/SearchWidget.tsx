import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';

// ─── Suggestion type ─────────────────────────────────────────────────────────

interface Suggestion {
    id: number;
    name: string;
    slug: string;
    price: number | null;
    image_url: string | null | undefined;
}

// ─── Debounce helper ─────────────────────────────────────────────────────────

function useDebouncedCallback<T extends unknown[]>(
    fn: (...args: T) => void | Promise<void>,
    delay: number,
): (...args: T) => void {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    return useCallback(
        (...args: T) => {
            if (timerRef.current !== null) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                void fn(...args);
            }, delay);
        },
        [fn, delay],
    );
}

// ─── Storefront preview ──────────────────────────────────────────────────────

function Preview({ component }: WidgetPreviewProps) {
    const {
        placeholder = 'Search products…',
    } = component.settings as Record<string, string>;

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // SSR safety — axios is only used client-side inside effects/callbacks
    const fetchSuggestions = useCallback(async (q: string): Promise<void> => {
        if (typeof window === 'undefined') return;
        if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
        setLoading(true);
        try {
            const res = await window.axios.get<Suggestion[]>('/search/suggest', { params: { q } });
            setSuggestions(res.data);
            setOpen(res.data.length > 0);
        } catch {
            setSuggestions([]);
            setOpen(false);
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedFetch = useDebouncedCallback(fetchSuggestions, 280);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setQuery(val);
            debouncedFetch(val);
        },
        [debouncedFetch],
    );

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (query.trim().length < 1) return;
            setOpen(false);
            router.visit(`/search?q=${encodeURIComponent(query.trim())}`);
        },
        [query],
    );

    const selectSuggestion = useCallback(
        (slug: string) => {
            setOpen(false);
            router.visit(`/product/${slug}`);
        },
        [],
    );

    // Close dropdown on outside click
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSubmit} role="search" aria-label="Product search">
                <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                    <input
                        type="search"
                        value={query}
                        onChange={handleChange}
                        placeholder={placeholder}
                        aria-label={placeholder}
                        aria-autocomplete="list"
                        aria-expanded={open}
                        aria-controls="search-suggestions"
                        className="flex-1 rounded-md bg-transparent px-4 py-2 text-sm outline-none"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        aria-label="Submit search"
                        className="flex h-full items-center justify-center rounded-r-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    >
                        {loading ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </form>

            {open && (
                <ul
                    id="search-suggestions"
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
                >
                    {suggestions.map((s) => (
                        <li
                            key={s.id}
                            role="option"
                            aria-selected={false}
                            onClick={() => selectSuggestion(s.slug)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') selectSuggestion(s.slug);
                            }}
                            tabIndex={0}
                            className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                        >
                            {s.image_url ? (
                                <img
                                    src={s.image_url}
                                    alt={s.name}
                                    className="h-9 w-9 rounded object-contain"
                                />
                            ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-xl">🛍</span>
                            )}
                            <div className="flex-1 truncate">
                                <p className="font-medium text-gray-800 truncate">{s.name}</p>
                                {s.price !== null && s.price !== undefined && (
                                    <p className="text-xs text-blue-600">
                                        RM {(s.price / 100).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Editor (canvas) ─────────────────────────────────────────────────────────

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    const { placeholder = 'Search products…' } = component.settings as Record<string, string>;
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            {/* Static preview in editor — no AJAX */}
            <div className="flex items-center rounded-md border border-gray-300 bg-white shadow-sm">
                <input
                    type="text"
                    readOnly
                    placeholder={placeholder}
                    className="flex-1 cursor-pointer rounded-md bg-transparent px-4 py-2 text-sm outline-none pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                />
                <span className="flex h-full items-center justify-center rounded-r-md bg-blue-600 px-4 py-2 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                </span>
            </div>
        </div>
    );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const s = component.settings as Record<string, string>;
    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Placeholder text</label>
                <input
                    type="text"
                    value={s['placeholder'] ?? 'Search products…'}
                    onChange={(e) => onChange({ ...s, placeholder: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}

// ─── Widget definition ────────────────────────────────────────────────────────

const def: WidgetDefinition = {
    type: 'search',
    version: 1,
    category: 'commerce',
    label: 'Search',
    icon: '🔍',
    hasChildren: false,
    defaultSettings: {
        placeholder: 'Search products…',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
