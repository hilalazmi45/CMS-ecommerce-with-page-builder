<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domain\PageBuilder\Models\PageBuilderTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PageBuilderTemplate>
 */
class PageBuilderTemplateFactory extends Factory
{
    protected $model = PageBuilderTemplate::class;

    /** @return array<model-property<PageBuilderTemplate>, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'type' => fake()->randomElement(['section', 'page', 'header', 'footer']),
            'content' => [
                'schemaVersion' => 1,
                'components' => [[
                    'id' => 'heading-fixture-1',
                    'type' => 'heading',
                    'version' => 1,
                    'settings' => ['text' => fake()->sentence()],
                    'styles' => ['desktop' => []],
                ]],
            ],
            'is_global' => false,
            'created_by' => null,
            'preview_image_id' => null,
        ];
    }
}
