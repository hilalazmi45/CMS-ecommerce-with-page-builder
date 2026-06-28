/**
 * Storefront Checkout page — /checkout
 *
 * Single-page checkout with sections: Contact, Shipping Address, Billing Address,
 * Shipping Method, Payment, and Order Review. Uses Inertia useForm for all
 * submission and error handling.
 *
 * Accessibility:
 *  - Every input has <label htmlFor>
 *  - Radio groups have <fieldset> + <legend>
 *  - Errors linked via aria-describedby
 *  - Flash error in aria-live="assertive"
 *  - First invalid field receives focus on submit failure
 *  - Visible focus rings throughout
 *
 * SSR-safety:
 *  - axios call is only in event handlers, never during render
 *  - No window/document access at module or render scope
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import type { AxiosInstance } from 'axios';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    ChevronDown,
    Loader2,
    MapPin,
    ShoppingBag,
    Truck,
    CreditCard,
    ClipboardList,
} from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';
import { formatMoney } from '@/utils/money';
import type {
    CartSummary,
    PageProps,
    ShippingMethod,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckoutFormData {
    email: string;
    phone: string;
    shipping_first_name: string;
    shipping_last_name: string;
    shipping_company: string;
    shipping_address_1: string;
    shipping_address_2: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postcode: string;
    shipping_country: string;
    billing_same_as_shipping: boolean;
    billing_first_name: string;
    billing_last_name: string;
    billing_company: string;
    billing_address_1: string;
    billing_address_2: string;
    billing_city: string;
    billing_state: string;
    billing_postcode: string;
    billing_country: string;
    shipping_method_id: number;
    customer_note: string;
    payment_method: string;
    idempotency_key: string;
}

interface CheckoutPageProps {
    cart: CartSummary;
    shippingMethods: ShippingMethod[];
    idempotencyKey: string;
}

// ---------------------------------------------------------------------------
// Country options
// ---------------------------------------------------------------------------

const COUNTRIES: { code: string; label: string }[] = [
    { code: 'MY', label: 'Malaysia' },
    { code: 'SG', label: 'Singapore' },
    { code: 'ID', label: 'Indonesia' },
    { code: 'TH', label: 'Thailand' },
    { code: 'PH', label: 'Philippines' },
    { code: 'VN', label: 'Vietnam' },
    { code: 'JP', label: 'Japan' },
    { code: 'CN', label: 'China' },
    { code: 'IN', label: 'India' },
    { code: 'AU', label: 'Australia' },
    { code: 'US', label: 'United States' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'CA', label: 'Canada' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Label with optional required marker. */
function FieldLabel({
    htmlFor,
    required,
    children,
}: {
    htmlFor: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-1 block text-sm font-medium text-gray-700"
        >
            {children}
            {required && (
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                    *
                </span>
            )}
        </label>
    );
}

/** Error message paragraph linked via id. */
function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={id} role="alert" className="mt-1 text-xs text-red-600">
            {message}
        </p>
    );
}

const inputBase =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#e60012] focus:outline-none focus:ring-1 focus:ring-[#e60012] disabled:bg-gray-50 disabled:text-gray-400';

const inputError =
    'border-red-400 focus:border-red-500 focus:ring-red-500';

/** Section card wrapper with heading. */
function SectionCard({
    id,
    icon,
    title,
    children,
}: {
    id?: string;
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={id ? `${id}-heading` : undefined}
            className="rounded-2xl border border-gray-100 bg-white p-6"
        >
            <h2
                id={id ? `${id}-heading` : undefined}
                className="mb-5 flex items-center gap-2 text-base font-bold text-gray-900"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e60012]/10 text-[#e60012]">
                    {icon}
                </span>
                {title}
            </h2>
            {children}
        </section>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Two-column grid for address fields. */
function AddressGrid({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    );
}

/** Country <select> with standard styling. */
function CountrySelect({
    id,
    value,
    onChange,
    disabled,
    errorId,
    hasError,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    errorId: string;
    hasError: boolean;
}) {
    return (
        <div className="relative">
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                aria-describedby={hasError ? errorId : undefined}
                aria-invalid={hasError}
                className={[
                    inputBase,
                    'appearance-none pr-9',
                    hasError ? inputError : '',
                ].join(' ')}
            >
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                        {c.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Shipping methods loader
// ---------------------------------------------------------------------------

function useShippingMethods(initialMethods: ShippingMethod[]) {
    const [methods, setMethods] = useState<ShippingMethod[]>(initialMethods);
    const [loading, setLoading] = useState(false);

    const fetchMethods = useCallback(
        async (country: string, state: string) => {
            if (!country) {
                setMethods([]);
                return;
            }
            setLoading(true);
            try {
                // axios is globally configured with CSRF by Laravel's bootstrap.
                // We cast window to avoid `any` — AxiosInstance is the correct type.
                const axiosInstance = (
                    window as Window & { axios: AxiosInstance }
                ).axios;
                const response = await axiosInstance.post<ShippingMethod[]>(
                    '/checkout/shipping-methods',
                    { country, state: state || undefined },
                );
                setMethods(response.data);
            } catch {
                // Network error — leave existing methods in place, don't crash.
                setMethods([]);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    return { methods, loading, fetchMethods };
}

// ---------------------------------------------------------------------------
// Order summary sidebar
// ---------------------------------------------------------------------------

function OrderSummary({
    cart,
    shippingMethod,
}: {
    cart: CartSummary;
    shippingMethod: ShippingMethod | null;
}) {
    const { currency, totals, applied_coupon } = cart;
    const shipping = shippingMethod
        ? shippingMethod.is_free
            ? 'Free'
            : formatMoney(shippingMethod.cost, currency)
        : totals.shipping_total > 0
          ? formatMoney(totals.shipping_total, currency)
          : '—';

    return (
        <aside className="lg:sticky lg:top-6 rounded-2xl border border-gray-100 bg-gray-50 p-6">
            <h2 className="mb-4 text-base font-bold text-gray-900">
                Order Summary
            </h2>

            {/* Item list */}
            <ul className="mb-4 space-y-2" aria-label="Cart items">
                {cart.items.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center gap-3 text-sm"
                    >
                        {item.image ? (
                            <img
                                src={item.image}
                                alt=""
                                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                <ShoppingBag
                                    size={16}
                                    className="text-gray-300"
                                    aria-hidden="true"
                                />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-800">
                                {item.name}
                            </p>
                            <p className="text-gray-400">
                                × {item.quantity}
                            </p>
                        </div>
                        <span className="shrink-0 font-semibold text-gray-900">
                            {formatMoney(item.line_total, currency)}
                        </span>
                    </li>
                ))}
            </ul>

            <dl className="space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between">
                    <dt className="text-gray-600">Subtotal</dt>
                    <dd className="font-medium text-gray-900">
                        {formatMoney(totals.subtotal, currency)}
                    </dd>
                </div>
                {totals.discount_total > 0 && (
                    <div className="flex justify-between">
                        <dt className="text-gray-600">
                            Discount
                            {applied_coupon?.valid && (
                                <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                                    {applied_coupon.code}
                                </span>
                            )}
                        </dt>
                        <dd className="font-medium text-green-700">
                            − {formatMoney(totals.discount_total, currency)}
                        </dd>
                    </div>
                )}
                <div className="flex justify-between">
                    <dt className="text-gray-600">Shipping</dt>
                    <dd className="font-medium text-gray-900">{shipping}</dd>
                </div>
                {totals.tax_total > 0 && (
                    <div className="flex justify-between">
                        <dt className="text-gray-600">Tax</dt>
                        <dd className="font-medium text-gray-900">
                            {formatMoney(totals.tax_total, currency)}
                        </dd>
                    </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-3 mt-1">
                    <dt className="font-bold text-gray-900">Total</dt>
                    <dd className="text-lg font-bold text-[#e60012]">
                        {formatMoney(totals.total, currency)}
                    </dd>
                </div>
            </dl>
        </aside>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Checkout({
    cart,
    shippingMethods: initialShippingMethods,
    idempotencyKey,
}: CheckoutPageProps) {
    const { flash } = usePage<PageProps>().props;

    // -----------------------------------------------------------------------
    // Form
    // -----------------------------------------------------------------------

    const form = useForm<CheckoutFormData>({
        email: '',
        phone: '',
        shipping_first_name: '',
        shipping_last_name: '',
        shipping_company: '',
        shipping_address_1: '',
        shipping_address_2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_postcode: '',
        shipping_country: 'MY',
        billing_same_as_shipping: true,
        billing_first_name: '',
        billing_last_name: '',
        billing_company: '',
        billing_address_1: '',
        billing_address_2: '',
        billing_city: '',
        billing_state: '',
        billing_postcode: '',
        billing_country: '',
        shipping_method_id: 0,
        customer_note: '',
        payment_method: 'cod',
        idempotency_key: idempotencyKey,
    });

    // -----------------------------------------------------------------------
    // Shipping methods
    // -----------------------------------------------------------------------

    const { methods, loading: methodsLoading, fetchMethods } = useShippingMethods(
        initialShippingMethods,
    );

    // Track the previous country+state so we only re-fetch when they change.
    // Stable ref to form.setData so it doesn't end up in effect deps.
    const setDataRef = useRef(form.setData);
    setDataRef.current = form.setData;

    const shippingCountry = form.data.shipping_country;
    const shippingState = form.data.shipping_state;
    const shippingMethodId = form.data.shipping_method_id;

    const prevCountryRef = useRef(shippingCountry);
    const prevStateRef = useRef(shippingState);

    // When shipping country or state changes, re-fetch shipping methods.
    useEffect(() => {
        if (
            shippingCountry !== prevCountryRef.current ||
            shippingState !== prevStateRef.current
        ) {
            prevCountryRef.current = shippingCountry;
            prevStateRef.current = shippingState;
            void fetchMethods(shippingCountry, shippingState);
        }
    }, [shippingCountry, shippingState, fetchMethods]);

    // When available methods change, reset the selected method if it's gone.
    useEffect(() => {
        if (
            shippingMethodId !== 0 &&
            !methods.some((m) => m.id === shippingMethodId)
        ) {
            setDataRef.current('shipping_method_id', 0);
        }
    }, [methods, shippingMethodId]);

    const selectedMethod =
        methods.find((m) => m.id === shippingMethodId) ?? null;

    // -----------------------------------------------------------------------
    // Focus-first-error on validation failure
    // -----------------------------------------------------------------------

    const formRef = useRef<HTMLFormElement>(null);
    const didSubmitRef = useRef(false);

    useEffect(() => {
        if (!didSubmitRef.current) return;
        if (Object.keys(form.errors).length === 0) return;

        const firstErrorField = formRef.current?.querySelector<HTMLElement>(
            '[aria-invalid="true"]',
        );
        firstErrorField?.focus();
        didSubmitRef.current = false;
    }, [form.errors]);

    // -----------------------------------------------------------------------
    // Submit
    // -----------------------------------------------------------------------

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (form.processing) return;
        didSubmitRef.current = true;
        form.post(route('checkout.store'));
    }

    // -----------------------------------------------------------------------
    // Field helpers
    // -----------------------------------------------------------------------

    type DataKey = keyof CheckoutFormData;

    function field(name: DataKey) {
        const errorId = `err-${name}`;
        const hasError = Boolean(form.errors[name]);
        return {
            id: name,
            name,
            value: form.data[name] as string,
            onChange: (
                e: React.ChangeEvent<
                    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                >,
            ) => form.setData(name, e.target.value as never),
            disabled: form.processing,
            'aria-describedby': hasError ? errorId : undefined,
            'aria-invalid': hasError as true | undefined,
            className: [inputBase, hasError ? inputError : ''].join(' '),
        };
    }

    function err(name: DataKey) {
        return (
            <FieldError
                id={`err-${name}`}
                message={form.errors[name]}
            />
        );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <StorefrontLayout>
            <Head>
                <title>Checkout</title>
            </Head>

            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Page heading */}
                <div className="mb-8 flex items-center gap-3">
                    <ArrowLeft
                        size={18}
                        className="text-gray-400"
                        aria-hidden="true"
                    />
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        Checkout
                    </h1>
                </div>

                {/* Flash error */}
                {flash.error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                        className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        <AlertCircle
                            size={16}
                            className="mt-0.5 shrink-0"
                            aria-hidden="true"
                        />
                        {flash.error}
                    </div>
                )}

                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    noValidate
                    className="grid gap-8 lg:grid-cols-[1fr_360px]"
                >
                    {/* --------------------------------------------------------
                        Left column — form sections
                    -------------------------------------------------------- */}
                    <div className="space-y-6">

                        {/* ---- Contact ---- */}
                        <SectionCard
                            id="section-contact"
                            icon={<CheckCircle size={14} aria-hidden="true" />}
                            title="Contact"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <FieldLabel htmlFor="email" required>
                                        Email address
                                    </FieldLabel>
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        {...field('email')}
                                        placeholder="you@example.com"
                                    />
                                    {err('email')}
                                </div>
                                <div>
                                    <FieldLabel htmlFor="phone">
                                        Phone number
                                    </FieldLabel>
                                    <input
                                        type="tel"
                                        autoComplete="tel"
                                        {...field('phone')}
                                        placeholder="+60 12 345 6789"
                                    />
                                    {err('phone')}
                                </div>
                            </div>
                        </SectionCard>

                        {/* ---- Shipping address ---- */}
                        <SectionCard
                            id="section-shipping"
                            icon={<MapPin size={14} aria-hidden="true" />}
                            title="Shipping Address"
                        >
                            <div className="space-y-4">
                                <AddressGrid>
                                    <div>
                                        <FieldLabel
                                            htmlFor="shipping_first_name"
                                            required
                                        >
                                            First name
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="shipping given-name"
                                            {...field('shipping_first_name')}
                                            placeholder="Ali"
                                        />
                                        {err('shipping_first_name')}
                                    </div>
                                    <div>
                                        <FieldLabel
                                            htmlFor="shipping_last_name"
                                            required
                                        >
                                            Last name
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="shipping family-name"
                                            {...field('shipping_last_name')}
                                            placeholder="Abdullah"
                                        />
                                        {err('shipping_last_name')}
                                    </div>
                                </AddressGrid>

                                <div>
                                    <FieldLabel htmlFor="shipping_company">
                                        Company (optional)
                                    </FieldLabel>
                                    <input
                                        type="text"
                                        autoComplete="shipping organization"
                                        {...field('shipping_company')}
                                        placeholder="Acme Sdn Bhd"
                                    />
                                    {err('shipping_company')}
                                </div>

                                <div>
                                    <FieldLabel
                                        htmlFor="shipping_address_1"
                                        required
                                    >
                                        Address line 1
                                    </FieldLabel>
                                    <input
                                        type="text"
                                        autoComplete="shipping address-line1"
                                        {...field('shipping_address_1')}
                                        placeholder="123 Jalan Merdeka"
                                    />
                                    {err('shipping_address_1')}
                                </div>

                                <div>
                                    <FieldLabel htmlFor="shipping_address_2">
                                        Address line 2 (optional)
                                    </FieldLabel>
                                    <input
                                        type="text"
                                        autoComplete="shipping address-line2"
                                        {...field('shipping_address_2')}
                                        placeholder="Unit 4B, Kompleks ABC"
                                    />
                                    {err('shipping_address_2')}
                                </div>

                                <AddressGrid>
                                    <div>
                                        <FieldLabel
                                            htmlFor="shipping_city"
                                            required
                                        >
                                            City
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="shipping address-level2"
                                            {...field('shipping_city')}
                                            placeholder="Kuala Lumpur"
                                        />
                                        {err('shipping_city')}
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="shipping_state">
                                            State / Province
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="shipping address-level1"
                                            {...field('shipping_state')}
                                            placeholder="Wilayah Persekutuan"
                                        />
                                        {err('shipping_state')}
                                    </div>
                                </AddressGrid>

                                <AddressGrid>
                                    <div>
                                        <FieldLabel htmlFor="shipping_postcode">
                                            Postcode
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="shipping postal-code"
                                            {...field('shipping_postcode')}
                                            placeholder="50450"
                                        />
                                        {err('shipping_postcode')}
                                    </div>
                                    <div>
                                        <FieldLabel
                                            htmlFor="shipping_country"
                                            required
                                        >
                                            Country
                                        </FieldLabel>
                                        <CountrySelect
                                            id="shipping_country"
                                            value={
                                                form.data.shipping_country
                                            }
                                            onChange={(v) =>
                                                form.setData(
                                                    'shipping_country',
                                                    v,
                                                )
                                            }
                                            disabled={form.processing}
                                            errorId="err-shipping_country"
                                            hasError={Boolean(
                                                form.errors.shipping_country,
                                            )}
                                        />
                                        {err('shipping_country')}
                                    </div>
                                </AddressGrid>
                            </div>
                        </SectionCard>

                        {/* ---- Billing address ---- */}
                        <SectionCard
                            id="section-billing"
                            icon={<ClipboardList size={14} aria-hidden="true" />}
                            title="Billing Address"
                        >
                            {/* Same-as-shipping checkbox */}
                            <div className="mb-4 flex items-center gap-2">
                                <input
                                    id="billing_same_as_shipping"
                                    type="checkbox"
                                    checked={
                                        form.data.billing_same_as_shipping
                                    }
                                    onChange={(e) =>
                                        form.setData(
                                            'billing_same_as_shipping',
                                            e.target.checked,
                                        )
                                    }
                                    disabled={form.processing}
                                    className="h-4 w-4 rounded border-gray-300 text-[#e60012] focus:ring-[#e60012]"
                                />
                                <label
                                    htmlFor="billing_same_as_shipping"
                                    className="text-sm font-medium text-gray-700"
                                >
                                    Same as shipping address
                                </label>
                            </div>

                            {!form.data.billing_same_as_shipping && (
                                <div className="space-y-4">
                                    <AddressGrid>
                                        <div>
                                            <FieldLabel
                                                htmlFor="billing_first_name"
                                                required
                                            >
                                                First name
                                            </FieldLabel>
                                            <input
                                                type="text"
                                                autoComplete="billing given-name"
                                                {...field('billing_first_name')}
                                                placeholder="Ali"
                                            />
                                            {err('billing_first_name')}
                                        </div>
                                        <div>
                                            <FieldLabel
                                                htmlFor="billing_last_name"
                                                required
                                            >
                                                Last name
                                            </FieldLabel>
                                            <input
                                                type="text"
                                                autoComplete="billing family-name"
                                                {...field('billing_last_name')}
                                                placeholder="Abdullah"
                                            />
                                            {err('billing_last_name')}
                                        </div>
                                    </AddressGrid>

                                    <div>
                                        <FieldLabel htmlFor="billing_company">
                                            Company (optional)
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="billing organization"
                                            {...field('billing_company')}
                                            placeholder="Acme Sdn Bhd"
                                        />
                                        {err('billing_company')}
                                    </div>

                                    <div>
                                        <FieldLabel
                                            htmlFor="billing_address_1"
                                            required
                                        >
                                            Address line 1
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="billing address-line1"
                                            {...field('billing_address_1')}
                                            placeholder="123 Jalan Merdeka"
                                        />
                                        {err('billing_address_1')}
                                    </div>

                                    <div>
                                        <FieldLabel htmlFor="billing_address_2">
                                            Address line 2 (optional)
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            autoComplete="billing address-line2"
                                            {...field('billing_address_2')}
                                            placeholder="Unit 4B, Kompleks ABC"
                                        />
                                        {err('billing_address_2')}
                                    </div>

                                    <AddressGrid>
                                        <div>
                                            <FieldLabel
                                                htmlFor="billing_city"
                                                required
                                            >
                                                City
                                            </FieldLabel>
                                            <input
                                                type="text"
                                                autoComplete="billing address-level2"
                                                {...field('billing_city')}
                                                placeholder="Kuala Lumpur"
                                            />
                                            {err('billing_city')}
                                        </div>
                                        <div>
                                            <FieldLabel htmlFor="billing_state">
                                                State / Province
                                            </FieldLabel>
                                            <input
                                                type="text"
                                                autoComplete="billing address-level1"
                                                {...field('billing_state')}
                                                placeholder="Wilayah Persekutuan"
                                            />
                                            {err('billing_state')}
                                        </div>
                                    </AddressGrid>

                                    <AddressGrid>
                                        <div>
                                            <FieldLabel htmlFor="billing_postcode">
                                                Postcode
                                            </FieldLabel>
                                            <input
                                                type="text"
                                                autoComplete="billing postal-code"
                                                {...field('billing_postcode')}
                                                placeholder="50450"
                                            />
                                            {err('billing_postcode')}
                                        </div>
                                        <div>
                                            <FieldLabel
                                                htmlFor="billing_country"
                                                required
                                            >
                                                Country
                                            </FieldLabel>
                                            <CountrySelect
                                                id="billing_country"
                                                value={
                                                    form.data.billing_country
                                                }
                                                onChange={(v) =>
                                                    form.setData(
                                                        'billing_country',
                                                        v,
                                                    )
                                                }
                                                disabled={form.processing}
                                                errorId="err-billing_country"
                                                hasError={Boolean(
                                                    form.errors.billing_country,
                                                )}
                                            />
                                            {err('billing_country')}
                                        </div>
                                    </AddressGrid>
                                </div>
                            )}
                        </SectionCard>

                        {/* ---- Shipping method ---- */}
                        <SectionCard
                            id="section-shipping-method"
                            icon={<Truck size={14} aria-hidden="true" />}
                            title="Shipping Method"
                        >
                            {methodsLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                        aria-hidden="true"
                                    />
                                    Loading shipping options…
                                </div>
                            ) : methods.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    {form.data.shipping_country
                                        ? 'No shipping methods available for this address.'
                                        : 'Enter your shipping address to see available methods.'}
                                </p>
                            ) : (
                                <fieldset>
                                    <legend className="sr-only">
                                        Choose a shipping method
                                    </legend>
                                    <div className="space-y-3">
                                        {methods.map((method) => {
                                            const selected =
                                                form.data.shipping_method_id ===
                                                method.id;
                                            return (
                                                <label
                                                    key={method.id}
                                                    className={[
                                                        'flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors',
                                                        selected
                                                            ? 'border-[#e60012] bg-red-50'
                                                            : 'border-gray-200 bg-white hover:border-gray-300',
                                                        form.processing
                                                            ? 'cursor-not-allowed opacity-60'
                                                            : '',
                                                    ].join(' ')}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="shipping_method_id"
                                                        value={method.id}
                                                        checked={selected}
                                                        onChange={() =>
                                                            form.setData(
                                                                'shipping_method_id',
                                                                method.id,
                                                            )
                                                        }
                                                        disabled={
                                                            form.processing
                                                        }
                                                        className="h-4 w-4 border-gray-300 text-[#e60012] focus:ring-[#e60012]"
                                                    />
                                                    <span className="flex-1 text-sm font-medium text-gray-900">
                                                        {method.title}
                                                    </span>
                                                    <span
                                                        className={[
                                                            'text-sm font-semibold',
                                                            method.is_free
                                                                ? 'text-green-600'
                                                                : 'text-gray-900',
                                                        ].join(' ')}
                                                    >
                                                        {method.is_free
                                                            ? 'Free'
                                                            : formatMoney(
                                                                  method.cost,
                                                                  cart.currency,
                                                              )}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            )}
                            {form.errors.shipping_method_id && (
                                <p
                                    role="alert"
                                    className="mt-2 text-xs text-red-600"
                                >
                                    {form.errors.shipping_method_id}
                                </p>
                            )}
                        </SectionCard>

                        {/* ---- Payment ---- */}
                        <SectionCard
                            id="section-payment"
                            icon={<CreditCard size={14} aria-hidden="true" />}
                            title="Payment"
                        >
                            <fieldset>
                                <legend className="sr-only">
                                    Choose a payment method
                                </legend>
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e60012] bg-red-50 p-4">
                                    <input
                                        type="radio"
                                        name="payment_method"
                                        value="cod"
                                        checked={
                                            form.data.payment_method === 'cod'
                                        }
                                        onChange={() =>
                                            form.setData(
                                                'payment_method',
                                                'cod',
                                            )
                                        }
                                        disabled={form.processing}
                                        className="mt-0.5 h-4 w-4 border-gray-300 text-[#e60012] focus:ring-[#e60012]"
                                    />
                                    <div>
                                        <span className="block text-sm font-semibold text-gray-900">
                                            Cash on Delivery
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Pay with cash when your order is
                                            delivered.
                                        </span>
                                    </div>
                                </label>
                            </fieldset>
                            {form.errors.payment_method && (
                                <p
                                    role="alert"
                                    className="mt-2 text-xs text-red-600"
                                >
                                    {form.errors.payment_method}
                                </p>
                            )}
                        </SectionCard>

                        {/* ---- Order notes ---- */}
                        <SectionCard
                            id="section-notes"
                            icon={
                                <ClipboardList
                                    size={14}
                                    aria-hidden="true"
                                />
                            }
                            title="Order Notes (optional)"
                        >
                            <FieldLabel htmlFor="customer_note">
                                Special instructions for your order
                            </FieldLabel>
                            <textarea
                                id="customer_note"
                                name="customer_note"
                                rows={3}
                                value={form.data.customer_note}
                                onChange={(e) =>
                                    form.setData(
                                        'customer_note',
                                        e.target.value,
                                    )
                                }
                                disabled={form.processing}
                                placeholder="e.g. Please leave at the door."
                                className={inputBase}
                            />
                        </SectionCard>

                        {/* Hidden idempotency key */}
                        <input
                            type="hidden"
                            name="idempotency_key"
                            value={form.data.idempotency_key}
                        />
                    </div>

                    {/* --------------------------------------------------------
                        Right column — order summary + submit
                    -------------------------------------------------------- */}
                    <div className="space-y-6">
                        <OrderSummary
                            cart={cart}
                            shippingMethod={selectedMethod}
                        />

                        {/* Place order button */}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-xl bg-[#e60012] px-6 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#c5000f] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012] focus-visible:ring-offset-2"
                            aria-busy={form.processing}
                        >
                            {form.processing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                        aria-hidden="true"
                                    />
                                    Placing order…
                                </span>
                            ) : (
                                'Place Order'
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            By placing your order you agree to our terms of
                            service.
                        </p>

                        <div className="text-center">
                            <a
                                href="/cart"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                            >
                                <ArrowLeft size={14} aria-hidden="true" />
                                Return to cart
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </StorefrontLayout>
    );
}
