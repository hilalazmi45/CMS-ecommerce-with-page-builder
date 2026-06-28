/**
 * Account Details — /my-account/details
 *
 * Shows current name/email and provides a password change form. Both forms
 * post to the EXISTING Breeze profile routes (profile.update, password.update)
 * to avoid duplicating controller/validation logic.
 *
 * SSR-safe: no browser-only APIs.
 */

import { useEffect, useRef } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AccountLayout from './AccountLayout';
import type { PageProps } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetailsProps {
    user: {
        name: string;
        email: string;
    };
    status: string | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FieldProps {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
    error?: string;
    autoComplete?: string;
    required?: boolean;
}

function FormField({
    id,
    label,
    type = 'text',
    value,
    onChange,
    disabled,
    error,
    autoComplete,
    required,
}: FieldProps) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                autoComplete={autoComplete}
                aria-describedby={error ? `${id}-error` : undefined}
                className={[
                    'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 disabled:opacity-50',
                    error
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-[#e60012] focus:ring-[#e60012]',
                ].join(' ')}
            />
            {error && (
                <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Profile details form (name + email)
// ---------------------------------------------------------------------------

function ProfileForm({ user }: { user: DetailsProps['user'] }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Profile Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                    id="name"
                    label="Full Name"
                    value={data.name}
                    onChange={(v) => setData('name', v)}
                    disabled={processing}
                    error={errors.name}
                    autoComplete="name"
                    required
                />
                <FormField
                    id="email"
                    label="Email Address"
                    type="email"
                    value={data.email}
                    onChange={(v) => setData('email', v)}
                    disabled={processing}
                    error={errors.email}
                    autoComplete="email"
                    required
                />
            </div>
            <div className="mt-4 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-xl bg-[#e60012] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c5000f] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
                >
                    {processing ? 'Saving…' : 'Save Changes'}
                </button>
                {recentlySuccessful && (
                    <p role="status" aria-live="polite" className="text-sm text-green-600">
                        Saved.
                    </p>
                )}
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Password change form
// ---------------------------------------------------------------------------

function PasswordForm() {
    const passwordRef = useRef<HTMLInputElement>(null);

    const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (errors.password) {
            reset('password', 'password_confirmation');
            passwordRef.current?.focus();
        }
    }, [errors.password, reset]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="mb-4 font-semibold text-gray-900">Change Password</h3>
            <div className="grid gap-4">
                <FormField
                    id="current_password"
                    label="Current Password"
                    type="password"
                    value={data.current_password}
                    onChange={(v) => setData('current_password', v)}
                    disabled={processing}
                    error={errors.current_password}
                    autoComplete="current-password"
                    required
                />
                <FormField
                    id="password"
                    label="New Password"
                    type="password"
                    value={data.password}
                    onChange={(v) => setData('password', v)}
                    disabled={processing}
                    error={errors.password}
                    autoComplete="new-password"
                    required
                />
                <FormField
                    id="password_confirmation"
                    label="Confirm New Password"
                    type="password"
                    value={data.password_confirmation}
                    onChange={(v) => setData('password_confirmation', v)}
                    disabled={processing}
                    error={errors.password_confirmation}
                    autoComplete="new-password"
                    required
                />
            </div>
            {/* Hidden ref for focus management */}
            <input type="password" ref={passwordRef} className="sr-only" tabIndex={-1} aria-hidden="true" />
            <div className="mt-4 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                >
                    {processing ? 'Updating…' : 'Update Password'}
                </button>
                {recentlySuccessful && (
                    <p role="status" aria-live="polite" className="text-sm text-green-600">
                        Password updated.
                    </p>
                )}
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Details({ user, status }: DetailsProps) {
    const { auth } = usePage<PageProps>().props;
    void auth; // auth is available via usePage if needed

    return (
        <AccountLayout activeRoute={route('account.details')} title="Account Details">
            <Head title="Account Details" />

            {status && (
                <div
                    role="status"
                    aria-live="polite"
                    className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
                >
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <ProfileForm user={user} />
                <PasswordForm />
            </div>
        </AccountLayout>
    );
}
