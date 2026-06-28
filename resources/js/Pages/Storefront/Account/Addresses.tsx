/**
 * Account Addresses — /my-account/addresses
 *
 * Lists saved billing and shipping addresses. Provides an inline add/edit
 * form (toggled per card) posting to the account address routes via useForm.
 * SSR-safe: no browser-only APIs.
 */

import { useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import AccountLayout from './AccountLayout';
import type { CustomerAddress, PageProps } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddressesProps {
    addresses: CustomerAddress[];
}

interface AddressFormData {
    type: 'billing' | 'shipping';
    label: string;
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
    is_default: boolean;
}

// ---------------------------------------------------------------------------
// Address form (add / edit)
// ---------------------------------------------------------------------------

interface AddressFormProps {
    /** null = create mode; CustomerAddress = edit mode */
    address: CustomerAddress | null;
    onCancel: () => void;
}

function AddressForm({ address, onCancel }: AddressFormProps) {
    const isEdit = address !== null;

    const { data, setData, post, put, processing, errors, reset } = useForm<AddressFormData>({
        type: address?.type ?? 'shipping',
        label: address?.label ?? '',
        first_name: address?.first_name ?? '',
        last_name: address?.last_name ?? '',
        company: address?.company ?? '',
        address_1: address?.address_1 ?? '',
        address_2: address?.address_2 ?? '',
        city: address?.city ?? '',
        state: address?.state ?? '',
        postcode: address?.postcode ?? '',
        country: address?.country ?? '',
        phone: address?.phone ?? '',
        is_default: address?.is_default ?? false,
    });

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isEdit && address) {
            put(route('account.addresses.update', { address: address.ulid }), {
                preserveScroll: true,
                onSuccess: () => onCancel(),
            });
        } else {
            post(route('account.addresses.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onCancel();
                },
            });
        }
    }

    const inputCls = (field: keyof typeof errors) =>
        [
            'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 disabled:opacity-50',
            errors[field]
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                : 'border-gray-300 focus:border-[#e60012] focus:ring-[#e60012]',
        ].join(' ');

    function field(id: keyof AddressFormData, label: string, required = false) {
        const errMsg = errors[id];
        const strValue = String(data[id] ?? '');
        return (
            <div>
                <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
                    {label}
                    {required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                    id={id}
                    type="text"
                    value={strValue}
                    onChange={(e) => setData(id, e.target.value as never)}
                    disabled={processing}
                    aria-describedby={errMsg ? `${id}-error` : undefined}
                    className={inputCls(id)}
                />
                {errMsg && (
                    <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
                        {errMsg}
                    </p>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-[#e60012]/30 bg-red-50 p-5">
            <h4 className="mb-4 font-semibold text-gray-900">
                {isEdit ? 'Edit Address' : 'Add New Address'}
            </h4>

            {/* Type */}
            <div className="mb-4">
                <fieldset>
                    <legend className="mb-1.5 text-xs font-medium text-gray-600">
                        Type<span className="ml-0.5 text-red-500">*</span>
                    </legend>
                    <div className="flex gap-4">
                        {(['shipping', 'billing'] as const).map((t) => (
                            <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="radio"
                                    name="type"
                                    value={t}
                                    checked={data.type === t}
                                    onChange={() => setData('type', t)}
                                    disabled={processing}
                                    className="text-[#e60012] focus:ring-[#e60012]"
                                />
                                <span className="capitalize">{t}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {field('label', 'Label (e.g. Home, Work)')}
                {field('first_name', 'First Name', true)}
                {field('last_name', 'Last Name', true)}
                {field('company', 'Company')}
                {field('address_1', 'Address Line 1', true)}
                {field('address_2', 'Address Line 2')}
                {field('city', 'City', true)}
                {field('state', 'State / Province')}
                {field('postcode', 'Postcode')}
                {field('country', 'Country (2-letter code)', true)}
                {field('phone', 'Phone')}
            </div>

            {/* Default toggle */}
            <div className="mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={data.is_default}
                        onChange={(e) => setData('is_default', e.target.checked)}
                        disabled={processing}
                        className="rounded text-[#e60012] focus:ring-[#e60012]"
                    />
                    Set as default {data.type} address
                </label>
            </div>

            <div className="mt-4 flex gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-xl bg-[#e60012] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c5000f] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
                >
                    {processing ? 'Saving…' : isEdit ? 'Update Address' : 'Save Address'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={processing}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------------
// Address card
// ---------------------------------------------------------------------------

interface AddressCardProps {
    address: CustomerAddress;
    onEdit: (address: CustomerAddress) => void;
}

function AddressCard({ address, onEdit }: AddressCardProps) {
    const [deleting, setDeleting] = useState(false);

    function handleDelete() {
        if (deleting) return;
        if (!window.confirm('Delete this address?')) return;
        setDeleting(true);
        router.delete(route('account.addresses.destroy', { address: address.ulid }), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    }

    return (
        <div className="relative rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-700">
            {address.is_default && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#e60012]/10 px-2 py-0.5 text-xs font-semibold text-[#e60012]">
                    <Star size={11} aria-hidden="true" />
                    Default
                </span>
            )}
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {address.label ?? address.type}
            </p>
            <p className="font-semibold text-gray-900">
                {address.first_name} {address.last_name}
            </p>
            {address.company && <p>{address.company}</p>}
            <p>{address.address_1}</p>
            {address.address_2 && <p>{address.address_2}</p>}
            <p>
                {[address.city, address.state, address.postcode].filter(Boolean).join(', ')}
            </p>
            <p>{address.country}</p>
            {address.phone && (
                <p className="mt-1 text-gray-500">{address.phone}</p>
            )}

            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    onClick={() => onEdit(address)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    <Pencil size={12} aria-hidden="true" />
                    Edit
                </button>
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-[#e60012] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Addresses({ addresses }: AddressesProps) {
    const { flash } = usePage<PageProps>().props;
    /** null = no form open; 'add' = add form; CustomerAddress = edit form for that address */
    const [formState, setFormState] = useState<null | 'add' | CustomerAddress>(null);

    return (
        <AccountLayout activeRoute={route('account.addresses')} title="Saved Addresses">
            <Head title="My Addresses" />

            {/* Flash messages */}
            {(flash.success ?? flash.error) && (
                <div
                    role="status"
                    aria-live="polite"
                    className={[
                        'mb-4 rounded-xl px-4 py-3 text-sm font-medium',
                        flash.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
                    ].join(' ')}
                >
                    {flash.success ?? flash.error}
                </div>
            )}

            {/* Add button (only when no form is open) */}
            {formState === null && (
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={() => setFormState('add')}
                        className="flex items-center gap-2 rounded-xl bg-[#e60012] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c5000f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add New Address
                    </button>
                </div>
            )}

            {/* Add form */}
            {formState === 'add' && (
                <div className="mb-6">
                    <AddressForm address={null} onCancel={() => setFormState(null)} />
                </div>
            )}

            {/* Address list */}
            {addresses.length === 0 && formState === null ? (
                <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center text-sm text-gray-400">
                    No saved addresses yet. Add one above.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((addr) =>
                        formState !== null && typeof formState === 'object' && formState.ulid === addr.ulid ? (
                            <AddressForm
                                key={addr.ulid}
                                address={addr}
                                onCancel={() => setFormState(null)}
                            />
                        ) : (
                            <AddressCard
                                key={addr.ulid}
                                address={addr}
                                onEdit={(a) => setFormState(a)}
                            />
                        )
                    )}
                </div>
            )}
        </AccountLayout>
    );
}
