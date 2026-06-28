<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ $title ?? config('app.name') }}</title>
    <style>
        /* Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        /* Base */
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .wrapper { background-color: #f4f4f5; padding: 32px 16px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
        .header { background-color: #18181b; padding: 24px 32px; }
        .header a { color: #ffffff; font-size: 20px; font-weight: 700; text-decoration: none; }
        .content { padding: 32px; color: #27272a; font-size: 15px; line-height: 1.6; }
        .content h2 { margin: 0 0 16px; font-size: 20px; color: #18181b; }
        .content p { margin: 0 0 16px; }
        /* Order table */
        .order-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
        .order-table th { background-color: #f4f4f5; text-align: left; padding: 10px 12px; color: #71717a; font-weight: 600; border-bottom: 1px solid #e4e4e7; }
        .order-table td { padding: 10px 12px; border-bottom: 1px solid #f4f4f5; vertical-align: top; }
        .order-table tr:last-child td { border-bottom: none; }
        /* Totals */
        .totals-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 24px; }
        .totals-table td { padding: 6px 0; }
        .totals-table td:last-child { text-align: right; }
        .totals-table .total-row td { font-weight: 700; font-size: 16px; border-top: 2px solid #e4e4e7; padding-top: 10px; }
        /* Address */
        .address-block { background-color: #f9f9f9; border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 14px; }
        .address-block strong { display: block; margin-bottom: 6px; color: #18181b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
        /* Badge */
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .badge-green { background-color: #dcfce7; color: #15803d; }
        .badge-yellow { background-color: #fef9c3; color: #a16207; }
        .badge-blue { background-color: #dbeafe; color: #1d4ed8; }
        /* Button */
        .btn-container { text-align: center; margin: 24px 0; }
        .btn { display: inline-block; padding: 12px 28px; background-color: #18181b; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
        /* Footer */
        .footer { padding: 24px 32px; text-align: center; color: #a1a1aa; font-size: 13px; border-top: 1px solid #f4f4f5; }
    </style>
</head>
<body>
<div class="wrapper">
    <table class="container" role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td class="header">
                <a href="{{ config('app.url') }}">{{ config('app.name') }}</a>
            </td>
        </tr>
        <tr>
            <td class="content">
                @yield('slot')
            </td>
        </tr>
        <tr>
            <td class="footer">
                &copy; {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
            </td>
        </tr>
    </table>
</div>
</body>
</html>
