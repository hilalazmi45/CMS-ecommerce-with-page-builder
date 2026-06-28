<?php

declare(strict_types=1);

namespace Database\Factories\Domain\Media;

use App\Domain\Media\Models\Media;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Media>
 */
class MediaFactory extends Factory
{
    protected $model = Media::class;

    /** @return array<model-property<Media>, mixed> */
    public function definition(): array
    {
        return [
            'ulid' => (string) Str::ulid(),
            'disk' => 'public',
            'path' => 'default/2026/06/'.Str::ulid().'.jpg',
            'file_name' => $this->faker->word().'.jpg',
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size' => $this->faker->numberBetween(10_000, 500_000),
            'width' => null,
            'height' => null,
            'srcset' => null,
            'alt' => null,
            'title' => null,
            'collection' => 'default',
            'uploaded_by' => null,
        ];
    }
}
