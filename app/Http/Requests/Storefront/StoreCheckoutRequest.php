<?php

declare(strict_types=1);

namespace App\Http\Requests\Storefront;

use App\Domain\Payments\Services\PaymentGatewayManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Contact
            'email' => ['required', 'email', 'max:191'],
            'phone' => ['nullable', 'string', 'max:50'],

            // Shipping address
            'shipping_first_name' => ['required', 'string', 'max:191'],
            'shipping_last_name' => ['required', 'string', 'max:191'],
            'shipping_company' => ['nullable', 'string', 'max:191'],
            'shipping_address_1' => ['required', 'string', 'max:255'],
            'shipping_address_2' => ['nullable', 'string', 'max:255'],
            'shipping_city' => ['required', 'string', 'max:191'],
            'shipping_state' => ['nullable', 'string', 'max:191'],
            'shipping_postcode' => ['nullable', 'string', 'max:20'],
            'shipping_country' => ['required', 'string', 'size:2'],

            // Billing toggle
            'billing_same_as_shipping' => ['boolean'],

            // Billing address — required when billing differs from shipping
            'billing_first_name' => ['required_if:billing_same_as_shipping,false', 'nullable', 'string', 'max:191'],
            'billing_last_name' => ['required_if:billing_same_as_shipping,false', 'nullable', 'string', 'max:191'],
            'billing_company' => ['nullable', 'string', 'max:191'],
            'billing_address_1' => ['required_if:billing_same_as_shipping,false', 'nullable', 'string', 'max:255'],
            'billing_address_2' => ['nullable', 'string', 'max:255'],
            'billing_city' => ['required_if:billing_same_as_shipping,false', 'nullable', 'string', 'max:191'],
            'billing_state' => ['nullable', 'string', 'max:191'],
            'billing_postcode' => ['nullable', 'string', 'max:20'],
            'billing_country' => ['nullable', 'string', 'size:2'],

            // Method / payment
            'shipping_method_id' => ['required', 'integer', 'exists:shipping_zone_methods,id'],
            'customer_note' => ['nullable', 'string', 'max:1000'],
            'payment_method' => [
                'required',
                Rule::in(array_keys(app(PaymentGatewayManager::class)->enabled())),
            ],
            'idempotency_key' => ['required', 'string', 'max:64'],
        ];
    }
}
