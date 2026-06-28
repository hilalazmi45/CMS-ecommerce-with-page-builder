@extends('mail.layout', ['title' => 'Refund Processed — ' . $order->order_number])

@section('slot')
    <h2>Your refund has been processed</h2>
    <p>Hi {{ e($billingFirstName) }}, a refund for order <strong>{{ $order->order_number }}</strong> has been successfully processed.</p>

    <table class="totals-table" role="presentation">
        <tr>
            <td>Refund amount</td>
            <td><strong>{{ $currency }} {{ number_format($refundAmountMinor / 100, 2) }}</strong></td>
        </tr>
        <tr>
            <td>Order total</td>
            <td>{{ $currency }} {{ number_format($order->total / 100, 2) }}</td>
        </tr>
        <tr>
            <td>Total refunded</td>
            <td>{{ $currency }} {{ number_format($order->amount_refunded / 100, 2) }}</td>
        </tr>
    </table>

    <p>
        <strong>Refund status:</strong> <span class="badge badge-blue">{{ ucwords(str_replace('_', ' ', (string) $order->payment_status)) }}</span>
    </p>

    <p>Refunds typically appear on your statement within 5–10 business days, depending on your bank or payment provider.</p>

    <p style="color:#71717a;font-size:13px;margin-top:24px">
        If you have not received your refund within 10 business days, please contact your bank or reply to this email for assistance.
    </p>
@endsection
