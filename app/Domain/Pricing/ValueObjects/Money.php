<?php

declare(strict_types=1);

namespace App\Domain\Pricing\ValueObjects;

use App\Domain\Pricing\Enums\RoundingMode;
use InvalidArgumentException;

/**
 * Immutable money value object.
 *
 * Amounts are stored as integer **minor units** (e.g. cents/sen) plus an ISO
 * 4217 currency code. Never represent money with binary floats (CLAUDE.md
 * §9.1). All arithmetic between two Money instances requires matching
 * currencies; mixing currencies throws.
 */
final readonly class Money
{
    public function __construct(
        public int $minor,
        public string $currency,
    ) {
        if (! preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new InvalidArgumentException("Invalid ISO 4217 currency code: {$currency}");
        }
    }

    public static function of(int $minor, string $currency): self
    {
        return new self($minor, strtoupper($currency));
    }

    public static function zero(string $currency): self
    {
        return new self(0, strtoupper($currency));
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->minor + $other->minor, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->minor - $other->minor, $this->currency);
    }

    /** Multiply by an integer factor (e.g. a line quantity) — always exact. */
    public function multiply(int $factor): self
    {
        return new self($this->minor * $factor, $this->currency);
    }

    /**
     * Multiply by a fractional rate (e.g. a tax/discount percentage expressed
     * as 0.06 for 6%) and round to whole minor units using an explicit mode.
     */
    public function multiplyByRate(float $rate, RoundingMode $mode = RoundingMode::HalfUp): self
    {
        $raw = $this->minor * $rate;

        $rounded = match ($mode) {
            RoundingMode::HalfUp => (int) round($raw, 0, PHP_ROUND_HALF_UP),
            RoundingMode::HalfDown => (int) round($raw, 0, PHP_ROUND_HALF_DOWN),
            RoundingMode::Floor => (int) floor($raw),
            RoundingMode::Ceiling => (int) ceil($raw),
        };

        return new self($rounded, $this->currency);
    }

    public function isZero(): bool
    {
        return $this->minor === 0;
    }

    public function isNegative(): bool
    {
        return $this->minor < 0;
    }

    public function equals(self $other): bool
    {
        return $this->minor === $other->minor && $this->currency === $other->currency;
    }

    public function isGreaterThan(self $other): bool
    {
        $this->assertSameCurrency($other);

        return $this->minor > $other->minor;
    }

    /** The smaller of two amounts (same currency). */
    public function min(self $other): self
    {
        $this->assertSameCurrency($other);

        return $this->minor <= $other->minor ? $this : $other;
    }

    /** The larger of two amounts (same currency). */
    public function max(self $other): self
    {
        $this->assertSameCurrency($other);

        return $this->minor >= $other->minor ? $this : $other;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException(
                "Cannot operate on mismatched currencies: {$this->currency} vs {$other->currency}"
            );
        }
    }
}
