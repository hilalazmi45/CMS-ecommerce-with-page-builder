<?php

declare(strict_types=1);

namespace App\Domain\Orders\ValueObjects;

/**
 * Typed DTO carrying validated checkout input.
 *
 * Built from a validated array (e.g. from StoreCheckoutRequest). All address
 * fields are strings; nullable fields may be null. This is a pure data carrier —
 * no I/O, no Eloquent state.
 */
final readonly class CheckoutData
{
    public function __construct(
        public string $email,
        public ?string $phone,
        // Shipping address
        public string $shippingFirstName,
        public string $shippingLastName,
        public ?string $shippingCompany,
        public string $shippingAddress1,
        public ?string $shippingAddress2,
        public string $shippingCity,
        public ?string $shippingState,
        public ?string $shippingPostcode,
        public string $shippingCountry,
        // Billing
        public bool $billingSameAsShipping,
        public ?string $billingFirstName,
        public ?string $billingLastName,
        public ?string $billingCompany,
        public ?string $billingAddress1,
        public ?string $billingAddress2,
        public ?string $billingCity,
        public ?string $billingState,
        public ?string $billingPostcode,
        public ?string $billingCountry,
        // Method / payment
        public int $shippingMethodId,
        public ?string $customerNote,
        public string $paymentMethod,
        public string $idempotencyKey,
    ) {}

    /**
     * Build from a fully-validated request data array.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromValidated(array $data): self
    {
        $sas = (bool) ($data['billing_same_as_shipping'] ?? true);

        return new self(
            email: (string) $data['email'],
            phone: isset($data['phone']) ? (string) $data['phone'] : null,
            shippingFirstName: (string) $data['shipping_first_name'],
            shippingLastName: (string) $data['shipping_last_name'],
            shippingCompany: isset($data['shipping_company']) ? (string) $data['shipping_company'] : null,
            shippingAddress1: (string) $data['shipping_address_1'],
            shippingAddress2: isset($data['shipping_address_2']) ? (string) $data['shipping_address_2'] : null,
            shippingCity: (string) $data['shipping_city'],
            shippingState: isset($data['shipping_state']) ? (string) $data['shipping_state'] : null,
            shippingPostcode: isset($data['shipping_postcode']) ? (string) $data['shipping_postcode'] : null,
            shippingCountry: (string) $data['shipping_country'],
            billingSameAsShipping: $sas,
            billingFirstName: $sas ? null : (isset($data['billing_first_name']) ? (string) $data['billing_first_name'] : null),
            billingLastName: $sas ? null : (isset($data['billing_last_name']) ? (string) $data['billing_last_name'] : null),
            billingCompany: $sas ? null : (isset($data['billing_company']) ? (string) $data['billing_company'] : null),
            billingAddress1: $sas ? null : (isset($data['billing_address_1']) ? (string) $data['billing_address_1'] : null),
            billingAddress2: $sas ? null : (isset($data['billing_address_2']) ? (string) $data['billing_address_2'] : null),
            billingCity: $sas ? null : (isset($data['billing_city']) ? (string) $data['billing_city'] : null),
            billingState: $sas ? null : (isset($data['billing_state']) ? (string) $data['billing_state'] : null),
            billingPostcode: $sas ? null : (isset($data['billing_postcode']) ? (string) $data['billing_postcode'] : null),
            billingCountry: $sas ? null : (isset($data['billing_country']) ? (string) $data['billing_country'] : null),
            shippingMethodId: (int) $data['shipping_method_id'],
            customerNote: isset($data['customer_note']) ? (string) $data['customer_note'] : null,
            paymentMethod: (string) $data['payment_method'],
            idempotencyKey: (string) $data['idempotency_key'],
        );
    }

    /**
     * Shipping address as a flat array for persisting to order_addresses.
     *
     * @return array<string, mixed>
     */
    public function shippingAddressArray(): array
    {
        return [
            'first_name' => $this->shippingFirstName,
            'last_name' => $this->shippingLastName,
            'company' => $this->shippingCompany,
            'address_1' => $this->shippingAddress1,
            'address_2' => $this->shippingAddress2,
            'city' => $this->shippingCity,
            'state' => $this->shippingState,
            'postcode' => $this->shippingPostcode,
            'country' => $this->shippingCountry,
            'phone' => $this->phone,
            'email' => $this->email,
        ];
    }

    /**
     * Billing address as a flat array. Returns the shipping address array when
     * billing_same_as_shipping is true, so only one block needs to be written.
     *
     * @return array<string, mixed>
     */
    public function billingAddressArray(): array
    {
        if ($this->billingSameAsShipping) {
            return $this->shippingAddressArray();
        }

        return [
            'first_name' => $this->billingFirstName ?? $this->shippingFirstName,
            'last_name' => $this->billingLastName ?? $this->shippingLastName,
            'company' => $this->billingCompany,
            'address_1' => $this->billingAddress1 ?? $this->shippingAddress1,
            'address_2' => $this->billingAddress2,
            'city' => $this->billingCity ?? $this->shippingCity,
            'state' => $this->billingState ?? $this->shippingState,
            'postcode' => $this->billingPostcode ?? $this->shippingPostcode,
            'country' => $this->billingCountry ?? $this->shippingCountry,
            'phone' => $this->phone,
            'email' => $this->email,
        ];
    }
}
