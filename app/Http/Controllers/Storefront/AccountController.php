<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Customers\Models\CustomerAddress;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderAddress;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\StoreAddressRequest;
use App\Http\Requests\Storefront\UpdateAddressRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    // ─── Dashboard ──────────────────────────────────────────────────────────────

    public function dashboard(Request $request): Response
    {
        $user = $request->user();

        /** @var User $user */
        $recentOrders = Order::where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->withCount('items')
            ->get()
            ->map(fn (Order $o): array => $this->orderRow($o));

        $totalOrders = Order::where('user_id', $user->id)->count();
        $totalAddresses = CustomerAddress::where('user_id', $user->id)->count();

        return Inertia::render('Storefront/Account/Dashboard', [
            'recentOrders' => $recentOrders,
            'totalOrders' => $totalOrders,
            'totalAddresses' => $totalAddresses,
        ]);
    }

    // ─── Orders ─────────────────────────────────────────────────────────────────

    public function orders(Request $request): Response
    {
        $user = $request->user();

        /** @var User $user */
        $paginated = Order::where('user_id', $user->id)
            ->withCount('items')
            ->latest()
            ->paginate(10)
            ->through(fn (Order $o): array => $this->orderRow($o));

        return Inertia::render('Storefront/Account/Orders', [
            'orders' => $paginated,
        ]);
    }

    public function showOrder(Request $request, Order $order): Response
    {
        $user = $request->user();

        /** @var User $user */
        if ($order->user_id !== $user->id) {
            abort(403);
        }

        $order->load(['items', 'addresses', 'statusHistory']);

        return Inertia::render('Storefront/Account/OrderView', [
            'order' => [
                'ulid' => $order->ulid,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'currency' => $order->currency,
                'subtotal' => $order->subtotal,
                'discount_total' => $order->discount_total,
                'shipping_total' => $order->shipping_total,
                'tax_total' => $order->tax_total,
                'total' => $order->total,
                'amount_refunded' => $order->amount_refunded,
                'coupon_code' => $order->coupon_code,
                'shipping_method' => $order->shipping_method,
                'customer_note' => $order->customer_note,
                'created_at' => $order->created_at,
                'items' => $order->items->map(fn (OrderItem $i): array => [
                    'name' => $i->name,
                    'sku' => $i->sku,
                    'quantity' => $i->quantity,
                    'unit_price' => $i->unit_price,
                    'subtotal' => $i->subtotal,
                    'discount' => $i->discount,
                    'tax' => $i->tax,
                    'total' => $i->total,
                    'meta' => $i->meta ?? [],
                ])->all(),
                'addresses' => $order->addresses->map(fn (OrderAddress $a): array => [
                    'type' => $a->type,
                    'first_name' => $a->first_name,
                    'last_name' => $a->last_name,
                    'company' => $a->company,
                    'address_1' => $a->address_1,
                    'address_2' => $a->address_2,
                    'city' => $a->city,
                    'state' => $a->state,
                    'postcode' => $a->postcode,
                    'country' => $a->country,
                    'phone' => $a->phone,
                    'email' => $a->email,
                ])->all(),
                // Status timeline: include to_status + created_at for all entries;
                // include note text ONLY when is_customer_note is true (never expose admin notes).
                'timeline' => $order->statusHistory->map(fn (OrderStatusHistory $h): array => [
                    'to_status' => $h->to_status,
                    'note' => $h->is_customer_note ? $h->note : null,
                    'created_at' => $h->created_at,
                ])->all(),
            ],
        ]);
    }

    // ─── Addresses ──────────────────────────────────────────────────────────────

    public function addresses(Request $request): Response
    {
        $user = $request->user();

        /** @var User $user */
        $addresses = CustomerAddress::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderBy('type')
            ->orderBy('id')
            ->get()
            ->map(fn (CustomerAddress $a): array => $this->addressRow($a));

        return Inertia::render('Storefront/Account/Addresses', [
            'addresses' => $addresses,
        ]);
    }

    public function storeAddress(StoreAddressRequest $request): RedirectResponse
    {
        $user = $request->user();

        /** @var User $user */
        $validated = $request->validated();
        $validated['user_id'] = $user->id;

        (new CustomerAddress)->fill($validated)->save();

        return redirect()->route('account.addresses')->with('success', 'Address added.');
    }

    public function updateAddress(UpdateAddressRequest $request, CustomerAddress $address): RedirectResponse
    {
        $user = $request->user();

        /** @var User $user */
        if ($address->user_id !== $user->id) {
            abort(403);
        }

        $address->update($request->validated());

        return redirect()->route('account.addresses')->with('success', 'Address updated.');
    }

    public function destroyAddress(Request $request, CustomerAddress $address): RedirectResponse
    {
        $user = $request->user();

        /** @var User $user */
        if ($address->user_id !== $user->id) {
            abort(403);
        }

        $address->delete();

        return redirect()->route('account.addresses')->with('success', 'Address deleted.');
    }

    // ─── Details ────────────────────────────────────────────────────────────────

    public function details(Request $request): Response
    {
        $user = $request->user();

        /** @var User $user */
        return Inertia::render('Storefront/Account/Details', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'status' => session('status'),
        ]);
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    /**
     * Curated order row for list/dashboard views — excludes internal fields.
     *
     * @return array<string, mixed>
     */
    private function orderRow(Order $o): array
    {
        return [
            'ulid' => $o->ulid,
            'order_number' => $o->order_number,
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'currency' => $o->currency,
            'total' => $o->total,
            'item_count' => $o->items_count ?? 0,
            'created_at' => $o->created_at,
        ];
    }

    /**
     * Curated address row for the address list.
     *
     * @return array<string, mixed>
     */
    private function addressRow(CustomerAddress $a): array
    {
        return [
            'ulid' => $a->ulid,
            'type' => $a->type,
            'label' => $a->label,
            'first_name' => $a->first_name,
            'last_name' => $a->last_name,
            'company' => $a->company,
            'address_1' => $a->address_1,
            'address_2' => $a->address_2,
            'city' => $a->city,
            'state' => $a->state,
            'postcode' => $a->postcode,
            'country' => $a->country,
            'phone' => $a->phone,
            'is_default' => $a->is_default,
        ];
    }
}
