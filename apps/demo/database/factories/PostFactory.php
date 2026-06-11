<?php

namespace Database\Factories;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    protected $model = Post::class;

    private const TOPICS = [
        'charts', 'tables', 'forms', 'uploads', 'panels',
        'filters', 'media', 'auth', 'validation', 'relations',
        'notifications', 'queues', 'caching', 'testing', 'deployment',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $topic = $this->faker->randomElement(self::TOPICS);
        $adjective = $this->faker->randomElement(['deep dive into', 'guide to', 'patterns for', 'overview of', 'tips for']);
        $createdAt = $this->faker->dateTimeBetween('-12 months', 'now');
        $published = $this->faker->boolean(70);

        return [
            'title' => [
                'en' => ucfirst("{$adjective} {$topic}"),
                'uk' => "Огляд теми: {$topic}",
            ],
            'slug' => Str::slug("{$adjective} {$topic}").'-'.Str::random(6),
            'intro' => $this->faker->boolean(33)
                ? ['en' => $this->faker->sentence(12), 'uk' => $this->faker->sentence(10)]
                : null,
            'body' => null,
            'published' => $published,
            'published_at' => $published
                ? Carbon::instance($createdAt)->addHours($this->faker->numberBetween(1, 72))
                : null,
            'views' => $this->faker->numberBetween(0, 5000),
            'rating' => $this->faker->boolean(20)
                ? round($this->faker->randomFloat(1, 1.0, 5.0), 1)
                : null,
            'metadata' => [],
            'author_id' => null,
            'sections' => $this->faker->boolean(20)
                ? [['heading' => ucfirst($this->faker->words(3, true)), 'body' => $this->faker->paragraph()]]
                : null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }

    /**
     * Post is published with a published_at set after created_at.
     */
    public function published(): static
    {
        return $this->state(function (array $attributes) {
            $createdAt = $attributes['created_at'] ?? now();

            return [
                'published' => true,
                'published_at' => Carbon::instance(
                    is_string($createdAt) ? new \DateTime($createdAt) : $createdAt
                )->addHours($this->faker->numberBetween(1, 72)),
            ];
        });
    }

    /**
     * Post is a draft with no published_at.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'published' => false,
            'published_at' => null,
        ]);
    }

    /**
     * Post has at least one section.
     */
    public function withSections(): static
    {
        return $this->state(fn (array $attributes) => [
            'sections' => [
                ['heading' => ucfirst($this->faker->words(3, true)), 'body' => $this->faker->paragraph()],
            ],
        ]);
    }
}
