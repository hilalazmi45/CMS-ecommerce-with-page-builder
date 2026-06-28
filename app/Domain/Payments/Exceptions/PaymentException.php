<?php

declare(strict_types=1);

namespace App\Domain\Payments\Exceptions;

use RuntimeException;

/**
 * Base exception for all payment-domain failures.
 *
 * Extend this to create typed failure variants. The message is safe to log
 * but should NOT be returned to the browser directly — translate it into a
 * user-facing error in the controller layer.
 */
class PaymentException extends RuntimeException {}
