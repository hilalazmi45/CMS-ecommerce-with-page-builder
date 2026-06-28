<?php

declare(strict_types=1);

namespace App\Http\Requests\Storefront;

use Illuminate\Foundation\Http\FormRequest;

class StoreAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership is enforced in the controller via the route-bound model or
        // explicit user_id scoping — not here, so every authenticated user passes.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:billing,shipping'],
            'label' => ['nullable', 'string', 'max:191'],
            'first_name' => ['required', 'string', 'max:191'],
            'last_name' => ['required', 'string', 'max:191'],
            'company' => ['nullable', 'string', 'max:191'],
            'address_1' => ['required', 'string', 'max:255'],
            'address_2' => ['nullable', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:191'],
            'state' => ['nullable', 'string', 'max:191'],
            'postcode' => ['nullable', 'string', 'max:20'],
            'country' => ['required', 'string', 'size:2'],
            'phone' => ['nullable', 'string', 'max:50'],
            'is_default' => ['boolean'],
        ];
    }
}
