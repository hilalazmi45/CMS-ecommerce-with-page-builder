<?php

declare(strict_types=1);

namespace App\Domain\Payments\Exceptions;

/**
 * Thrown when a method is called on a gateway that does not support the
 * requested capability (e.g. refund on COD, which has no online refund flow).
 *
 * Callers should check `$gateway->supports('refund')` before calling
 * `$gateway->refund(...)` and surface a user-friendly message instead of
 * catching this exception in production paths.
 */
class UnsupportedCapabilityException extends PaymentException {}
