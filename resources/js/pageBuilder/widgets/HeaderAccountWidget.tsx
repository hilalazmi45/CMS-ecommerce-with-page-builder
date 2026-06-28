import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

function AccountIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
        </svg>
    );
}

function Preview({ component }: WidgetPreviewProps) {
    const { label = 'Account' } = component.settings as Record<string, string>;
    const [open, setOpen] = useState(false);

    // Personalised greeting when a user is authenticated (Inertia shared props).
    let userName: string | undefined;
    try {
        const auth = (usePage().props as { auth?: { user?: { name?: string } } }).auth;
        userName = auth?.user?.name;
    } catch {
        userName = undefined;
    }
    const firstName = userName ? userName.split(' ')[0] : undefined;

    return (
        <div className="wd-header-my-account wd-tools-element relative">
            <button
                type="button"
                className="flex items-center gap-2 text-gray-700 hover:text-[#e60012]"
                onClick={() => setOpen((v) => !v)}
                aria-label="My account"
            >
                <span className="wd-tools-icon">
                    <AccountIcon />
                </span>
                <span className="wd-tools-text hidden whitespace-nowrap text-sm font-medium md:block">
                    {firstName ? `Hello, ${firstName}` : label}
                </span>
            </button>

            {open && (
                <div className="wd-dropdown absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-lg border border-gray-100 bg-white py-2 shadow-lg">
                    {firstName ? (
                        <>
                            <a href="/account" onClick={(e) => e.preventDefault()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#e60012]">My Account</a>
                            <a href="/account/orders" onClick={(e) => e.preventDefault()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#e60012]">My Orders</a>
                            <a href="/logout" onClick={(e) => e.preventDefault()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#e60012]">Logout</a>
                        </>
                    ) : (
                        <>
                            <a href="/login" onClick={(e) => e.preventDefault()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#e60012]">Login</a>
                            <a href="/register" onClick={(e) => e.preventDefault()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-[#e60012]">Register</a>
                        </>
                    )}
                </div>
            )}
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
                <label className="block text-xs font-medium text-gray-600">Label</label>
                <input
                    type="text"
                    value={s.label ?? 'Account'}
                    onChange={(e) => onChange({ ...s, label: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'header-account',
    version: 1,
    category: 'layout',
    label: 'Header Account',
    icon: '👤',
    hasChildren: false,
    defaultSettings: {
        label: 'Account',
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
