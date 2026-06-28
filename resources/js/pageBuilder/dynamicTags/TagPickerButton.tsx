/**
 * TagPickerButton — a small inline button that opens a popover listing all
 * available dynamic tags. Clicking a tag appends its token `{key}` to the
 * target text field value.
 *
 * Props:
 *  value    — current field value (used to append the token)
 *  onChange — called with the new value after tag insertion
 *
 * Accessibility:
 *  - The trigger button has an aria-label.
 *  - The popover is role="listbox" with role="option" items.
 *  - Escape closes the popover and returns focus to the trigger.
 *  - Clicking outside closes the popover.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllTags } from './registry';
import type { DynamicTag } from './types';

interface TagPickerButtonProps {
    value: string;
    onChange: (newValue: string) => void;
}

const CATEGORY_LABELS: Record<DynamicTag['category'], string> = {
    product: 'Product',
    site: 'Site',
    page: 'Page',
    date: 'Date',
};

export function TagPickerButton({ value, onChange }: TagPickerButtonProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const tags = getAllTags();

    // Group by category
    const grouped = tags.reduce<Partial<Record<DynamicTag['category'], DynamicTag[]>>>(
        (acc, tag) => {
            const list = acc[tag.category] ?? [];
            list.push(tag);
            acc[tag.category] = list;
            return acc;
        },
        {},
    );

    const insert = useCallback(
        (key: string) => {
            onChange(value + `{${key}}`);
            setOpen(false);
            triggerRef.current?.focus();
        },
        [value, onChange],
    );

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    return (
        <span className="relative inline-block">
            <button
                ref={triggerRef}
                type="button"
                aria-label="Insert dynamic tag"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((o) => !o)}
                className="rounded border border-blue-400 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
                {'{ }'}
            </button>

            {open && (
                <div
                    ref={popoverRef}
                    role="listbox"
                    aria-label="Dynamic tags"
                    className="absolute right-0 top-full z-50 mt-1 w-56 overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg"
                    style={{ maxHeight: '260px' }}
                >
                    {(Object.entries(grouped) as [DynamicTag['category'], DynamicTag[]][]).map(
                        ([category, items]) => (
                            <div key={category}>
                                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    {CATEGORY_LABELS[category]}
                                </div>
                                {items.map((tag) => (
                                    <button
                                        key={tag.key}
                                        role="option"
                                        aria-selected={false}
                                        type="button"
                                        onClick={() => insert(tag.key)}
                                        title={tag.description}
                                        className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                                    >
                                        <span className="text-xs font-medium text-gray-800">
                                            {tag.label}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {'{'}
                                            {tag.key}
                                            {'}'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ),
                    )}
                </div>
            )}
        </span>
    );
}
