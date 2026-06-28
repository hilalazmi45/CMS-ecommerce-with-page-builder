<?php

declare(strict_types=1);

namespace App\Domain\Media\Models;

use App\Models\User;
use Database\Factories\Domain\Media\MediaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Media extends Model
{
    /** @use HasFactory<MediaFactory> */
    use HasFactory, SoftDeletes;

    /** @return Factory<self> */
    protected static function newFactory(): Factory
    {
        return MediaFactory::new();
    }

    protected $table = 'media';

    protected $fillable = [
        'ulid',
        'disk',
        'path',
        'file_name',
        'mime_type',
        'extension',
        'size',
        'width',
        'height',
        'srcset',
        'alt',
        'title',
        'collection',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'srcset' => 'array',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $media) {
            if (empty($media->ulid)) {
                $media->ulid = (string) Str::ulid();
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function url(): string
    {
        if (str_starts_with($this->path, 'http://') || str_starts_with($this->path, 'https://')) {
            return $this->path;
        }

        return Storage::disk($this->disk)->url($this->path);
    }

    public function getRouteKeyName(): string
    {
        return 'ulid';
    }
}
