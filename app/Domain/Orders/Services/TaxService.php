<?php

declare(strict_types=1);

namespace App\Domain\Orders\Services;

use App\Domain\Orders\Models\TaxRate;
use App\Domain\Orders\ValueObjects\TaxBreakdown;
use App\Domain\Orders\ValueObjects\TaxLine;
use App\Domain\Pricing\Enums\RoundingMode;
use App\Domain\Pricing\ValueObjects\Money;
use Illuminate\Database\Eloquent\Collection;

/**
 * Computes tax for a taxable base against the configured tax_rates table.
 *
 * Matching: a rate applies when its country/state/postcode are NULL (wildcard)
 * or exactly match the destination address. Rates are applied in ascending
 * `priority` order. Non-compound rates apply to the base; compound rates apply
 * to the base plus tax accumulated so far (CLAUDE.md §9.8). Rounding is explicit
 * (half-up) per rate. The breakdown is snapshot-friendly so an order can store
 * exactly how tax was derived.
 */
class TaxService
{
    public function calculate(
        Money $taxableBase,
        ?string $country,
        ?string $state = null,
        ?string $postcode = null,
    ): TaxBreakdown {
        $currency = $taxableBase->currency;

        $rates = $this->matchingRates($country, $state, $postcode);

        if ($rates->isEmpty()) {
            return TaxBreakdown::none($currency);
        }

        $total = Money::zero($currency);
        $lines = [];

        foreach ($rates as $rate) {
            $base = $rate->is_compound ? $taxableBase->add($total) : $taxableBase;
            $amount = $base->multiplyByRate($rate->rate, RoundingMode::HalfUp);
            $total = $total->add($amount);

            $lines[] = new TaxLine(
                name: $rate->name,
                rate: $rate->rate,
                amount: $amount,
                isCompound: $rate->is_compound,
            );
        }

        return new TaxBreakdown($total, $lines);
    }

    /**
     * @return Collection<int, TaxRate>
     */
    private function matchingRates(?string $country, ?string $state, ?string $postcode)
    {
        return TaxRate::query()
            ->where(fn ($q) => $q->whereNull('country')->orWhere('country', $country))
            ->where(fn ($q) => $q->whereNull('state')->orWhere('state', $state))
            ->where(fn ($q) => $q->whereNull('postcode')->orWhere('postcode', $postcode))
            ->orderBy('priority')
            ->orderBy('id')
            ->get();
    }
}
