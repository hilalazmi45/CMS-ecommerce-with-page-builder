<?php

declare(strict_types=1);

namespace App\Domain\Payments\Enums;

/**
 * Canonical payment status values shared between PaymentTransaction records
 * and PaymentResult. The Order::payment_status column stores the string value;
 * map via ->value when writing to the database.
 */
enum PaymentStatus: string
{
    /** Payment is pending collection (e.g. COD, pending redirect). */
    case Pending = 'pending';

    /** Payment has been successfully captured. */
    case Paid = 'paid';

    /** Payment attempt failed. */
    case Failed = 'failed';

    /**
     * Gateway requires a redirect or further client action before the payment
     * can be confirmed (e.g. FPX redirect, 3DS). Not a final state.
     */
    case RequiresAction = 'requires_action';
}
