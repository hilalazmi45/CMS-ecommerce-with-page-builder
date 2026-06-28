<?php

declare(strict_types=1);

namespace App\Domain\PageBuilder\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class BuilderRevision extends Model
{
    protected $table = 'builder_revisions';

    public $timestamps = false;

    protected $fillable = [
        'owner_type', 'owner_id', 'content', 'label', 'is_published', 'created_by',
    ];

    protected $casts = [
        'content' => 'array',
        'is_published' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
