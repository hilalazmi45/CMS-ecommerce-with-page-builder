import AdminLayout from '@/Layouts/AdminLayout';
import { formatMoney } from '@/utils/money';
import { usePage, useForm } from '@inertiajs/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useId, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Address {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    country: string;
}

interface StatusHistory {
    id: number;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
    created_by?: { name: string } | null;
}

interface Transaction {
    id: number;
    ulid: string;
    gateway: string;
    status: string;
    amount: number;
    reference: string | null;
    created_at: string;
}

interface Order {
    ulid: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    amount_refunded: number;
    currency: string;
    payment_method: string | null;
    customer?: { name: string; email: string } | null;
    items: OrderItem[];
    billing_address?: Address | null;
    shipping_address?: Address | null;
    status_history: StatusHistory[];
    transactions: Transaction[];
    created_at: string;
}

interface Props {
    order: Order;
    /** True when the authenticated user has the order.process_refund permission. */
    canRefund: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUSES = ['pending', 'processing', 'on_hold', 'completed', 'cancelled', 'refunded', 'failed'];

/** Payment statuses that allow a new refund. */
const REFUNDABLE_PAYMENT_STATUSES: ReadonlySet<string> = new Set(['paid', 'partially_refunded']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a random hex string suitable as an idempotency key. */
function generateIdempotencyKey(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Refund Panel ─────────────────────────────────────────────────────────────

interface RefundPanelProps {
    order: Order;
}

function RefundPanel({ order }: RefundPanelProps) {
    const refundableBalance = order.total - order.amount_refunded;

    /**
     * The UI collects a MAJOR-unit amount (e.g. "10.50") and converts to
     * minor units (e.g. 1050) before sending to the server. This avoids
     * floating-point issues in display while keeping the server interface
     * in minor units (CLAUDE.md §9.1).
     */
    const [majorAmount, setMajorAmount] = useState<string>('');

    // One idempotency key per component mount — regenerated on page load so a
    // hard refresh gives a fresh key for a new attempt.
    const idempotencyKey = useRef(generateIdempotencyKey());
    const formId = useId();

    // Back-level errors (e.g. "refund") are returned via withErrors() and live in
    // Inertia's shared errors bag rather than in the form's typed field errors.
    const pageErrors = usePage().props.errors as Record<string, string | undefined>;
    const refundError = pageErrors['refund'];

    const refundForm = useForm<{
        amount: number;
        reason: string;
        restock: boolean;
        idempotency_key: string;
    }>({
        amount: 0,
        reason: '',
        restock: false,
        idempotency_key: idempotencyKey.current,
    });

    /** Keep the hidden amount (minor units) in sync with the major-unit input. */
    function handleMajorAmountChange(raw: string): void {
        setMajorAmount(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed > 0) {
            // Round to avoid floating-point artifacts (e.g. 10.1 → 1010, not 1009.9999…)
            refundForm.setData('amount', Math.round(parsed * 100));
        } else {
            refundForm.setData('amount', 0);
        }
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        refundForm.post(route('admin.orders.refund', order.ulid), {
            preserveScroll: true,
            onSuccess: () => {
                // Regenerate the key after a successful refund so the next
                // refund attempt (partial refund scenario) gets a fresh key.
                idempotencyKey.current = generateIdempotencyKey();
                refundForm.setData('idempotency_key', idempotencyKey.current);
                refundForm.setData('amount', 0);
                refundForm.setData('reason', '');
                refundForm.setData('restock', false);
                setMajorAmount('');
            },
        });
    }

    const maxMajorAmount = (refundableBalance / 100).toFixed(2);

    return (
        <div className="rounded-lg border border-red-200 bg-white p-4" aria-labelledby={`${formId}-heading`}>
            <h2 id={`${formId}-heading`} className="mb-1 font-semibold text-gray-900">
                Refund
            </h2>
            <p className="mb-3 text-sm text-gray-500">
                Refundable balance:{' '}
                <span className="font-medium text-gray-800">
                    {formatMoney(refundableBalance, order.currency)}
                </span>
            </p>

            {refundError && (
                <div role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {refundError}
                </div>
            )}

            <form id={formId} onSubmit={handleSubmit} className="space-y-3">
                {/* Amount — collected in major units, sent in minor units */}
                <div>
                    <label htmlFor={`${formId}-amount`} className="block text-sm font-medium text-gray-700">
                        Amount ({order.currency})
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            id={`${formId}-amount`}
                            type="number"
                            min="0.01"
                            max={maxMajorAmount}
                            step="0.01"
                            value={majorAmount}
                            onChange={(e) => handleMajorAmountChange(e.target.value)}
                            placeholder={`Max ${maxMajorAmount}`}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            aria-describedby={refundForm.errors.amount ? `${formId}-amount-err` : undefined}
                            required
                        />
                    </div>
                    {refundForm.errors.amount && (
                        <p id={`${formId}-amount-err`} role="alert" className="mt-1 text-xs text-red-600">
                            {refundForm.errors.amount}
                        </p>
                    )}
                </div>

                {/* Reason */}
                <div>
                    <label htmlFor={`${formId}-reason`} className="block text-sm font-medium text-gray-700">
                        Reason <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                        id={`${formId}-reason`}
                        value={refundForm.data.reason}
                        onChange={(e) => refundForm.setData('reason', e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Customer requested cancellation…"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                </div>

                {/* Restock */}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={refundForm.data.restock}
                        onChange={(e) => refundForm.setData('restock', e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-400"
                    />
                    Restock items to inventory
                </label>

                {/* Hidden idempotency key — sent with the POST */}
                <input type="hidden" name="idempotency_key" value={refundForm.data.idempotency_key} />

                <button
                    type="submit"
                    disabled={refundForm.processing || refundForm.data.amount <= 0}
                    className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    aria-busy={refundForm.processing}
                >
                    {refundForm.processing ? 'Processing…' : 'Issue Refund'}
                </button>
            </form>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OrderShow({ order, canRefund }: Props) {
    const { can } = usePermissions();

    const statusForm = useForm({ status: order.status, note: '' });
    const noteForm = useForm({ note: '', is_customer_note: false });

    function updateStatus(e: React.FormEvent) {
        e.preventDefault();
        statusForm.patch(route('admin.orders.update-status', order.ulid), { preserveScroll: true });
    }

    function addNote(e: React.FormEvent) {
        e.preventDefault();
        noteForm.post(route('admin.orders.add-note', order.ulid), {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    }

    const showRefundPanel =
        canRefund && REFUNDABLE_PAYMENT_STATUSES.has(order.payment_status);

    return (
        <AdminLayout title={`Order ${order.order_number}`}>
            <div className="grid grid-cols-3 gap-6">
                {/* Left: items + totals + notes + history */}
                <div className="col-span-2 space-y-4">
                    {/* Items table */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 font-semibold text-gray-900">Items</h2>
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500">
                                <tr>
                                    <th className="py-1 text-left">Product</th>
                                    <th className="py-1 text-right">Qty</th>
                                    <th className="py-1 text-right">Unit</th>
                                    <th className="py-1 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="py-2 font-medium text-gray-900">{item.name}</td>
                                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                                        <td className="py-2 text-right text-gray-600">
                                            {formatMoney(item.unit_price, order.currency)}
                                        </td>
                                        <td className="py-2 text-right font-medium">
                                            {formatMoney(item.total, order.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>{formatMoney(order.subtotal, order.currency)}</span>
                            </div>
                            {order.discount_total > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatMoney(order.discount_total, order.currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span>{formatMoney(order.shipping_total, order.currency)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax</span>
                                <span>{formatMoney(order.tax_total, order.currency)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-900 text-base">
                                <span>Total</span>
                                <span>{formatMoney(order.total, order.currency)}</span>
                            </div>
                            {order.amount_refunded > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Refunded</span>
                                    <span>-{formatMoney(order.amount_refunded, order.currency)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Note */}
                    {can('order.add_note') && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h2 className="mb-3 font-semibold text-gray-900">Add Note</h2>
                            <form onSubmit={addNote} className="space-y-3">
                                <textarea
                                    value={noteForm.data.note}
                                    onChange={(e) => noteForm.setData('note', e.target.value)}
                                    rows={3}
                                    placeholder="Internal note..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                                />
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm text-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={noteForm.data.is_customer_note}
                                            onChange={(e) => noteForm.setData('is_customer_note', e.target.checked)}
                                        />
                                        Notify customer
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={noteForm.processing}
                                        className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        Add Note
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Status History */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h2 className="mb-3 font-semibold text-gray-900">History</h2>
                        <div className="space-y-2">
                            {order.status_history.map((h) => (
                                <div key={h.id} className="text-sm">
                                    <div className="flex items-baseline justify-between">
                                        <span className="font-medium text-gray-800">
                                            {h.from_status ? `${h.from_status} → ` : ''}
                                            {h.to_status}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(h.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    {h.note && <p className="text-gray-600">{h.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: meta + status + payment + refund */}
                <div className="space-y-4">
                    {/* Update Status */}
                    {can('order.update_status') && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h2 className="mb-3 font-semibold text-gray-900">Update Status</h2>
                            <form onSubmit={updateStatus} className="space-y-3">
                                <select
                                    value={statusForm.data.status}
                                    onChange={(e) => statusForm.setData('status', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                                >
                                    {STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                                <textarea
                                    value={statusForm.data.note}
                                    onChange={(e) => statusForm.setData('note', e.target.value)}
                                    rows={2}
                                    placeholder="Note (optional)"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={statusForm.processing}
                                    className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Update
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Payment summary */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-1">
                        <h2 className="font-semibold text-gray-900 mb-2">Payment</h2>
                        <div className="flex justify-between text-gray-600">
                            <span>Status</span>
                            <span className="font-medium capitalize text-gray-900">
                                {order.payment_status.replace('_', ' ')}
                            </span>
                        </div>
                        {order.payment_method && (
                            <div className="flex justify-between text-gray-600">
                                <span>Method</span>
                                <span className="font-medium text-gray-900 uppercase">{order.payment_method}</span>
                            </div>
                        )}
                        {order.amount_refunded > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>Refunded</span>
                                <span className="font-medium">
                                    {formatMoney(order.amount_refunded, order.currency)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Refund panel — only visible when permission + payment status allow */}
                    {showRefundPanel && <RefundPanel order={order} />}

                    {/* Customer */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
                        <h2 className="font-semibold text-gray-900">Customer</h2>
                        {order.customer ? (
                            <div>
                                <div className="font-medium">{order.customer.name}</div>
                                <div className="text-gray-500">{order.customer.email}</div>
                            </div>
                        ) : (
                            <span className="text-gray-400">Guest checkout</span>
                        )}
                    </div>

                    {/* Billing address */}
                    {order.billing_address && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-1">
                            <h2 className="font-semibold text-gray-900">Billing</h2>
                            <div>
                                {order.billing_address.first_name} {order.billing_address.last_name}
                            </div>
                            <div className="text-gray-500">
                                {order.billing_address.address_1}, {order.billing_address.city},{' '}
                                {order.billing_address.country}
                            </div>
                        </div>
                    )}

                    {/* Transaction log */}
                    {order.transactions && order.transactions.length > 0 && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
                            <h2 className="font-semibold text-gray-900">Transactions</h2>
                            {order.transactions.map((tx) => (
                                <div key={tx.id} className="flex items-start justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0">
                                    <div>
                                        <div className="font-medium capitalize text-gray-800">
                                            {tx.status.replace('_', ' ')}
                                        </div>
                                        <div className="text-xs text-gray-400 uppercase">{tx.gateway}</div>
                                        {tx.reference && (
                                            <div className="text-xs text-gray-400 font-mono">{tx.reference}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-gray-900">
                                            {formatMoney(tx.amount, order.currency)}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
