<?php

declare(strict_types=1);

namespace App\Domain\Shipping\Services;

use App\Domain\Shipping\Exceptions\ShippingException;
use App\Domain\Shipping\Models\ShippingZone;
use App\Domain\Shipping\Models\ShippingZoneMethod;
use Illuminate\Support\Collection;

/**
 * Resolves available and selected shipping methods for a checkout address.
 *
 * Matching logic:
 *  - A zone applies when its `regions` JSON array contains the country code
 *    (e.g. 'MY') OR the "country:state" string (e.g. 'US:CA').
 *  - Active methods within matching zones are collected.
 *  - Methods with a `min_order_amount` condition are only included when the
 *    cart subtotal (in minor units) meets or exceeds that amount.
 *  - For free_shipping methods with a min_order_amount condition the same rule
 *    applies — eligibility based on subtotal.
 */
class ShippingService
{
    /**
     * Return all eligible shipping methods for the given address and subtotal.
     *
     * @return Collection<int, ShippingZoneMethod>
     */
    public function availableMethods(
        string $country,
        ?string $state,
        int $subtotalMinor,
    ): Collection {
        $country = strtoupper($country);
        $regionKey = $state !== null ? ($country.':'.strtoupper($state)) : null;

        /** @var Collection<int, ShippingZoneMethod> $methods */
        $methods = collect();

        ShippingZone::query()
            ->with(['methods' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->get()
            ->each(function (ShippingZone $zone) use ($country, $regionKey, $subtotalMinor, &$methods): void {
                $regions = $zone->regions ?? [];

                $matched = in_array($country, $regions, true)
                    || ($regionKey !== null && in_array($regionKey, $regions, true));

                if (! $matched) {
                    return;
                }

                /** @var ShippingZoneMethod $method */
                foreach ($zone->methods as $method) {
                    if ($this->methodEligible($method, $subtotalMinor)) {
                        $methods->push($method);
                    }
                }
            });

        return $methods;
    }

    /**
     * Resolve a specific shipping method ID for the given address and subtotal.
     *
     * The method must be present in `availableMethods()` for the given context.
     * Never silently falls back to zero — throws ShippingException if not eligible
     * (CLAUDE.md §9.9).
     *
     * @throws ShippingException when the requested method is not available
     */
    public function resolveMethod(
        int $methodId,
        string $country,
        ?string $state,
        int $subtotalMinor,
    ): ShippingZoneMethod {
        $available = $this->availableMethods($country, $state, $subtotalMinor);

        $method = $available->first(fn (ShippingZoneMethod $m): bool => $m->id === $methodId);

        if ($method === null) {
            throw new ShippingException(
                "Shipping method #{$methodId} is not available for the given address and order amount."
            );
        }

        return $method;
    }

    /**
     * Check whether a single method meets its conditions for the given subtotal.
     */
    private function methodEligible(ShippingZoneMethod $method, int $subtotalMinor): bool
    {
        $conditions = $method->conditions;

        if (! is_array($conditions)) {
            return true;
        }

        if (isset($conditions['min_order_amount'])) {
            $min = (int) $conditions['min_order_amount'];
            if ($subtotalMinor < $min) {
                return false;
            }
        }

        return true;
    }
}
