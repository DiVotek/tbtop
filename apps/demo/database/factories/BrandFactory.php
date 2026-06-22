<?php

namespace Database\Factories;

use App\Models\Brand;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Brand>
 */
class BrandFactory extends Factory
{
    protected $model = Brand::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $en = $this->faker->unique()->company();

        return [
            'name' => ['en' => $en, 'uk' => "Бренд: {$en}"],
            'slug' => Str::slug($en).'-'.Str::random(6),
            'website' => $this->faker->boolean(60) ? $this->faker->url() : null,
        ];
    }
}
