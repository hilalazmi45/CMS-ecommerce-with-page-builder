<?php

declare(strict_types=1);

use App\Domain\Orders\Services\OrderService;
use App\Domain\Orders\ValueObjects\LineItem;
use App\Domain\Pricing\ValueObjects\Money;

function usd(int $minor): Money
{
    return Money::of($minor, 'USD');
}

it('sums line totals into the subtotal', function () {
    $totals = (new OrderService)->calculate(
        [
            new LineItem(usd(1000), 2), // 2000
            new LineItem(usd(550), 3),  // 1650
        ],
        discount: Money::zero('USD'),
        shipping: Money::zero('USD'),
        tax: Money::zero('USD'),
    );

    expect($totals->subtotal->minor)->toBe(3650)
        ->and($totals->total->minor)->toBe(3650);
});

it('adds shipping and tax and subtracts discount', function () {
    $totals = (new OrderService)->calculate(
        [new LineItem(usd(10000), 1)],
        discount: usd(1500),
        shipping: usd(500),
        tax: usd(600),
    );

    // 10000 - 1500 + 500 + 600 = 9600
    expect($totals->subtotal->minor)->toBe(10000)
        ->and($totals->discount->minor)->toBe(1500)
        ->and($totals->total->minor)->toBe(9600);
});

it('caps the discount at the subtotal', function () {
    $totals = (new OrderService)->calculate(
        [new LineItem(usd(2000), 1)],
        discount: usd(5000), // exceeds subtotal
        shipping: usd(0),
        tax: usd(0),
    );

    expect($totals->discount->minor)->toBe(2000)
        ->and($totals->total->minor)->toBe(0);
});

it('handles an empty cart as zero totals', function () {
    $totals = (new OrderService)->calculate(
        [],
        discount: Money::zero('USD'),
        shipping: Money::zero('USD'),
        tax: Money::zero('USD'),
    );

    expect($totals->subtotal->minor)->toBe(0)
        ->and($totals->total->minor)->toBe(0);
});

it('flattens to the persisted minor-unit columns', function () {
    $totals = (new OrderService)->calculate(
        [new LineItem(usd(10000), 1)],
        discount: usd(1000),
        shipping: usd(500),
        tax: usd(540),
    );

    expect($totals->toMinorUnits())->toBe([
        'subtotal' => 10000,
        'discount_total' => 1000,
        'shipping_total' => 500,
        'tax_total' => 540,
        'total' => 10040,
    ]);
});

it('rejects mixed currencies across the inputs', function () {
    (new OrderService)->calculate(
        [new LineItem(usd(1000), 1)],
        discount: Money::zero('MYR'),
        shipping: Money::zero('USD'),
        tax: Money::zero('USD'),
    );
})->throws(InvalidArgumentException::class);

it('rejects a line item priced in a different currency', function () {
    (new OrderService)->calculate(
        [new LineItem(Money::of(1000, 'MYR'), 1)],
        discount: Money::zero('USD'),
        shipping: Money::zero('USD'),
        tax: Money::zero('USD'),
    );
})->throws(InvalidArgumentException::class);

it('rejects a non-positive quantity', function () {
    new LineItem(usd(100), 0);
})->throws(InvalidArgumentException::class);
