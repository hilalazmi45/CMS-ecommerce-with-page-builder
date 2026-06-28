@extends('mail.layout', ['title' => 'Your Order Has Been Shipped — ' . $order->order_number])

@section('slot')
    <h2>Your order is on its way!</h2>
    <p>Hi {{ e($billingFirstName) }}, great news — your order <strong>{{ $order->order_number }}</strong> has been completed and dispatched.</p>

    <p>
        <strong>Order status:</strong> <span class="badge badge-green">Completed</span>
    </p>

    @if ($order->items->isNotEmpty())
    <table class="order-table" role="presentation">
        <thead>
            <tr>
                <th>Product</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
            <tr>
                <td>{{ e($item->name) }}</td>
                <td style="text-align:center">{{ $item->quantity }}</td>
                <td style="text-align:right">{{ $currency }} {{ number_format($item->total / 100, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if ($shippingAddress)
    <div class="address-block">
        <strong>Delivering to</strong>
        {{ e($shippingAddress->first_name) }} {{ e($shippingAddress->last_name) }}<br>
        @if ($shippingAddress->company) {{ e($shippingAddress->company) }}<br> @endif
        {{ e($shippingAddress->address_1) }}<br>
        @if ($shippingAddress->address_2) {{ e($shippingAddress->address_2) }}<br> @endif
        {{ e($shippingAddress->city) }}, {{ e((string) ($shippingAddress->state ?? '')) }} {{ e((string) ($shippingAddress->postcode ?? '')) }}<br>
        {{ e($shippingAddress->country) }}
    </div>
    @endif

    <p style="color:#71717a;font-size:13px;margin-top:24px">
        If you have any questions about your shipment, please contact our support team quoting your order number.
    </p>
@endsection
