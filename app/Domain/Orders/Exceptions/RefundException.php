<?php

declare(strict_types=1);

namespace App\Domain\Orders\Exceptions;

use RuntimeException;

/**
 * Thrown when a refund request cannot be fulfilled due to a domain rule
 * violation (e.g. amount exceeds refundable balance, order is not in a
 * refundable state, or the upstream gateway rejects the refund).
 *
 * The message is safe to log but should be translated into a generic
 * user-facing error string at the controller layer — never expose raw
 * exception messages to the browser (CLAUDE.md §11.5).
 */
class RefundException extends RuntimeException {}
