<?php

declare(strict_types=1);

namespace App\Domain\Cms\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsPageRevision extends Model
{
    protected $table = 'cms_page_revisions';

    public $timestamps = false;

    protected $fillable = ['page_id', 'content', 'label', 'created_by'];

    protected $casts = [
        'content' => 'array',
        'created_at' => 'datetime',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(CmsPage::class, 'page_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
