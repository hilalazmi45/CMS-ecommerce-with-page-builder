<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Domain\Orders\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates an admin refund submission for a specific order.
 *
 * Authorization uses the OrderPolicy::process_refund gate, which is checked
 * against the route-bound Order model (CLAUDE.md §11.1).
 */
class RefundOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Order $order */
        $order = $this->route('order');

        return $this->user()?->can('process_refund', $order) ?? false;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            // Amount is in minor units (e.g. 1000 = RM 10.00 / $10.00).
            // The controller converts the major-unit UI input to minor units
            // — see RefundOrderRequest note below.
            // Here we accept the minor-unit integer directly from the frontend.
            'amount' => ['required', 'integer', 'min:1'],

            // Human-readable reason; optional but shown in the audit trail.
            'reason' => ['nullable', 'string', 'max:500'],

            // When true, inventory is restocked for all order items.
            'restock' => ['boolean'],

            // Client-generated key (e.g. a ULID or crypto random string) that
            // prevents duplicate submissions from network retries (CLAUDE.md §9.4).
            'idempotency_key' => ['required', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.min' => 'Refund amount must be at least 1 minor unit (e.g. 1 cent).',
            'idempotency_key.required' => 'An idempotency key is required to prevent duplicate refunds.',
        ];
    }
}
