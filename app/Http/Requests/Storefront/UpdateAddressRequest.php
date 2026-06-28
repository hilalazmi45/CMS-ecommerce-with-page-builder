<?php

declare(strict_types=1);

namespace App\Http\Requests\Storefront;

/**
 * Update rules are identical to store — reuse the parent.
 * Ownership is enforced in the controller (route-bound model scoped to user).
 */
class UpdateAddressRequest extends StoreAddressRequest {}
