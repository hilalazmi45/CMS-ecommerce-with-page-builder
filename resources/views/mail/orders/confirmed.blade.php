@extends('mail.layout', ['title' => 'Order Confirmed — ' . $order->order_number])

@section('slot')
    <h2>Thank you for your order!</h2>
    <p>Hi {{ e($billingFirstName) }}, your order has been received and is now being processed.</p>

    <p>
        <strong>Order number:</strong> {{ $order->order_number }}<br>
        <strong>Payment method:</strong> {{ ucwords(str_replace('_', ' ', (string) $order->payment_method)) }}<br>
        <strong>Payment status:</strong>
        <span class="badge badge-yellow">{{ ucwords(str_replace('_', ' ', (string) $order->payment_status)) }}</span>
    </p>

    @if ($order->items->isNotEmpty())
    <table class="order-table" role="presentation">
        <thead>
            <tr>
                <th>Product</th>
                <th>SKU</th>
                <th style="text-align:center">Qty</th>
                <th style="text-align:right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
            <tr>
                <td>{{ e($item->name) }}</td>
                <td style="color:#71717a">{{ e((string) ($item->sku ?? '—')) }}</td>
                <td style="text-align:center">{{ $item->quantity }}</td>
                <td style="text-align:right">{{ $currency }} {{ number_format($item->total / 100, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <table class="totals-table" role="presentation">
        <tr>
            <td>Subtotal</td>
            <td>{{ $currency }} {{ number_format($order->subtotal / 100, 2) }}</td>
        </tr>
        @if ($order->discount_total > 0)
        <tr>
            <td>Discount</td>
            <td>− {{ $currency }} {{ number_format($order->discount_total / 100, 2) }}</td>
        </tr>
        @endif
        <tr>
            <td>Shipping</td>
            <td>{{ $currency }} {{ number_format($order->shipping_total / 100, 2) }}</td>
        </tr>
        @if ($order->tax_total > 0)
        <tr>
            <td>Tax</td>
            <td>{{ $currency }} {{ number_format($order->tax_total / 100, 2) }}</td>
        </tr>
        @endif
        <tr class="total-row">
            <td>Order Total</td>
            <td>{{ $currency }} {{ number_format($order->total / 100, 2) }}</td>
        </tr>
    </table>

    @if ($shippingAddress)
    <div class="address-block">
        <strong>Shipping Address</strong>
        {{ e($shippingAddress->first_name) }} {{ e($shippingAddress->last_name) }}<br>
        @if ($shippingAddress->company) {{ e($shippingAddress->company) }}<br> @endif
        {{ e($shippingAddress->address_1) }}<br>
        @if ($shippingAddress->address_2) {{ e($shippingAddress->address_2) }}<br> @endif
        {{ e($shippingAddress->city) }}, {{ e((string) ($shippingAddress->state ?? '')) }} {{ e((string) ($shippingAddress->postcode ?? '')) }}<br>
        {{ e($shippingAddress->country) }}
    </div>
    @endif

    @if ($billingAddress)
    <div class="address-block">
        <strong>Billing Address</strong>
        {{ e($billingAddress->first_name) }} {{ e($billingAddress->last_name) }}<br>
        @if ($billingAddress->company) {{ e($billingAddress->company) }}<br> @endif
        {{ e($billingAddress->address_1) }}<br>
        @if ($billingAddress->address_2) {{ e($billingAddress->address_2) }}<br> @endif
        {{ e($billingAddress->city) }}, {{ e((string) ($billingAddress->state ?? '')) }} {{ e((string) ($billingAddress->postcode ?? '')) }}<br>
        {{ e($billingAddress->country) }}
    </div>
    @endif

    <p style="color:#71717a;font-size:13px;margin-top:24px">
        If you have any questions about your order, please reply to this email or contact our support team.
    </p>
@endsection
