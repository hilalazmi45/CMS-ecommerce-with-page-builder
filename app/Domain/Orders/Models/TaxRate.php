<?php

declare(strict_types=1);

namespace App\Domain\Orders\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $name
 * @property string|null $country
 * @property string|null $state
 * @property string|null $postcode
 * @property float $rate
 * @property bool $is_compound
 * @property int $priority
 */
class TaxRate extends Model
{
    protected $fillable = [
        'name', 'country', 'state', 'postcode', 'rate', 'is_compound', 'priority',
    ];

    protected $casts = [
        'rate' => 'float',
        'is_compound' => 'boolean',
        'priority' => 'integer',
    ];
}
