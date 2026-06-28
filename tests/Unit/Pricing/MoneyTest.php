<?php

declare(strict_types=1);

use App\Domain\Pricing\Enums\RoundingMode;
use App\Domain\Pricing\ValueObjects\Money;

it('constructs from minor units and exposes currency', function () {
    $m = Money::of(1599, 'myr');

    expect($m->minor)->toBe(1599)
        ->and($m->currency)->toBe('MYR');
});

it('rejects an invalid currency code', function () {
    Money::of(100, 'RINGGIT');
})->throws(InvalidArgumentException::class);

it('adds and subtracts same-currency amounts', function () {
    $a = Money::of(1000, 'USD');
    $b = Money::of(250, 'USD');

    expect($a->add($b)->minor)->toBe(1250)
        ->and($a->subtract($b)->minor)->toBe(750);
});

it('multiplies by an integer quantity exactly', function () {
    expect(Money::of(199, 'USD')->multiply(3)->minor)->toBe(597);
});

it('throws when mixing currencies', function () {
    Money::of(100, 'USD')->add(Money::of(100, 'MYR'));
})->throws(InvalidArgumentException::class);

it('rounds rate multiplication half-up by default', function () {
    // 1005 * 0.06 = 60.3 → 60
    expect(Money::of(1005, 'USD')->multiplyByRate(0.06)->minor)->toBe(60);
    // 1075 * 0.06 = 64.5 → 65 (half up)
    expect(Money::of(1075, 'USD')->multiplyByRate(0.06)->minor)->toBe(65);
});

it('supports floor and ceiling rounding', function () {
    expect(Money::of(1075, 'USD')->multiplyByRate(0.06, RoundingMode::Floor)->minor)->toBe(64)
        ->and(Money::of(1005, 'USD')->multiplyByRate(0.06, RoundingMode::Ceiling)->minor)->toBe(61);
});

it('reports zero and negative correctly', function () {
    expect(Money::zero('USD')->isZero())->toBeTrue()
        ->and(Money::of(-5, 'USD')->isNegative())->toBeTrue()
        ->and(Money::of(5, 'USD')->isNegative())->toBeFalse();
});

it('compares equality by minor and currency', function () {
    expect(Money::of(100, 'USD')->equals(Money::of(100, 'USD')))->toBeTrue()
        ->and(Money::of(100, 'USD')->equals(Money::of(100, 'MYR')))->toBeFalse()
        ->and(Money::of(100, 'USD')->equals(Money::of(101, 'USD')))->toBeFalse();
});

it('returns the min and max of two amounts', function () {
    $a = Money::of(100, 'USD');
    $b = Money::of(250, 'USD');

    expect($a->min($b)->minor)->toBe(100)
        ->and($a->max($b)->minor)->toBe(250);
});
