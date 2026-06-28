<?php

declare(strict_types=1);

namespace App\Domain\Catalogue\Exceptions;

use RuntimeException;

final class ReviewException extends RuntimeException
{
    public static function alreadyReviewed(): self
    {
        return new self('You have already submitted a review for this product.');
    }
}
