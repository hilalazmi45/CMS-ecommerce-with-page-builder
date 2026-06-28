<?php

declare(strict_types=1);

use App\Domain\Orders\Models\TaxRate;
use App\Domain\Orders\Services\OrderService;
use App\Domain\Orders\Services\TaxService;
use App\Domain\Orders\ValueObjects\LineItem;
use App\Domain\Pricing\ValueObjects\Money;

function myr(int $minor): Money
{
    return Money::of($minor, 'MYR');
}

it('returns zero tax when no rates exist', function () {
    $breakdown = (new TaxService)->calculate(myr(10000), 'MY');

    expect($breakdown->total->minor)->toBe(0)
        ->and($breakdown->lines)->toBe([]);
});

it('applies a single matching rate, rounded half-up', function () {
    TaxRate::create(['name' => 'SST', 'country' => 'MY', 'rate' => 0.06, 'priority' => 0]);

    // 10005 * 0.06 = 600.3 → 600
    $breakdown = (new TaxService)->calculate(myr(10005), 'MY');

    expect($breakdown->total->minor)->toBe(600)
        ->and($breakdown->lines)->toHaveCount(1)
        ->and($breakdown->lines[0]->name)->toBe('SST');
});

it('ignores rates for a different country', function () {
    TaxRate::create(['name' => 'VAT', 'country' => 'GB', 'rate' => 0.20, 'priority' => 0]);

    expect((new TaxService)->calculate(myr(10000), 'MY')->total->minor)->toBe(0);
});

it('applies wildcard (null country) rates everywhere', function () {
    TaxRate::create(['name' => 'Global', 'country' => null, 'rate' => 0.10, 'priority' => 0]);

    expect((new TaxService)->calculate(myr(10000), 'MY')->total->minor)->toBe(1000);
});

it('matches state-specific rates only for that state', function () {
    TaxRate::create(['name' => 'Selangor', 'country' => 'MY', 'state' => 'SGR', 'rate' => 0.05, 'priority' => 0]);

    expect((new TaxService)->calculate(myr(10000), 'MY', 'SGR')->total->minor)->toBe(500)
        ->and((new TaxService)->calculate(myr(10000), 'MY', 'KUL')->total->minor)->toBe(0);
});

it('stacks a compound rate on top of the base plus prior tax', function () {
    TaxRate::create(['name' => 'Base', 'country' => 'MY', 'rate' => 0.10, 'is_compound' => false, 'priority' => 1]);
    TaxRate::create(['name' => 'Compound', 'country' => 'MY', 'rate' => 0.05, 'is_compound' => true, 'priority' => 2]);

    // base 10000: A = 1000; B = (10000 + 1000) * 5% = 550; total = 1550
    $breakdown = (new TaxService)->calculate(myr(10000), 'MY');

    expect($breakdown->total->minor)->toBe(1550)
        ->and($breakdown->lines)->toHaveCount(2)
        ->and($breakdown->lines[1]->isCompound)->toBeTrue();
});

it('feeds into the order totals calculator', function () {
    TaxRate::create(['name' => 'SST', 'country' => 'MY', 'rate' => 0.06, 'priority' => 0]);

    $subtotalBase = myr(10000);
    $tax = (new TaxService)->calculate($subtotalBase, 'MY')->total;

    $totals = (new OrderService)->calculate(
        [new LineItem(myr(10000), 1)],
        discount: Money::zero('MYR'),
        shipping: Money::zero('MYR'),
        tax: $tax,
    );

    // 10000 + 600 tax = 10600
    expect($totals->tax->minor)->toBe(600)
        ->and($totals->total->minor)->toBe(10600);
});
