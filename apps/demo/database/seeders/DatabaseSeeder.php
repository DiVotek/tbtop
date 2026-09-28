<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\City;
use App\Models\Country;
use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            ['name' => 'Admin', 'password' => 'password', 'role' => 'admin'],
        );

        foreach ($this->posts($admin->id) as $post) {
            Post::updateOrCreate(['slug' => $post['slug']], $post);
        }

        foreach ($this->brands() as $brand) {
            Brand::updateOrCreate(['slug' => $brand['slug']], $brand);
        }

        $this->seedLocations();

        Setting::firstOrCreate([]);
    }

    private function seedLocations(): void
    {
        foreach ($this->locations() as $countryName => $cities) {
            $country = Country::updateOrCreate(['name' => $countryName]);
            foreach ($cities as $cityName => $people) {
                $city = City::updateOrCreate(['country_id' => $country->id, 'name' => $cityName]);
                foreach ($people as $person) {
                    User::updateOrCreate(
                        ['email' => Str::slug($person).'@demo.test'],
                        ['name' => $person, 'password' => 'password', 'role' => 'user', 'city_id' => $city->id],
                    );
                }
            }
        }
    }

    /** @return array<string, array<string, list<string>>> */
    private function locations(): array
    {
        return [
            'Ukraine' => [
                'Kyiv' => ['Olena Koval', 'Dmytro Savchenko'],
                'Lviv' => ['Sofia Melnyk', 'Andrii Boyko'],
            ],
            'Poland' => [
                'Warsaw' => ['Jan Kowalski', 'Anna Wojcik'],
                'Krakow' => ['Piotr Lewandowski'],
            ],
            'Germany' => [
                'Berlin' => ['Lukas Becker', 'Mia Schmidt'],
                'Munich' => ['Leon Fischer'],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function brands(): array
    {
        return [
            ['name' => ['en' => 'Brand', 'uk' => 'Марка'], 'slug' => 'brand', 'website' => 'https://example.com'],
            ['name' => ['en' => 'Acme', 'uk' => 'Акме'], 'slug' => 'acme', 'website' => null],
            ['name' => ['uk' => 'Тільки укр'], 'slug' => 'uk-only', 'website' => null],
        ];
    }

    /**
     * A richtext document with a `callout` embed the body field declares and a
     * `legacy` one it does not — the latter renders as an "Unknown block" card
     * and must survive a save unchanged.
     *
     * @return array<string, mixed>
     */
    private function bodyWithEmbeds(): array
    {
        $paragraph = fn (string $text): array => [
            'type' => 'paragraph', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0,
            'children' => [['type' => 'text', 'version' => 1, 'text' => $text, 'detail' => 0, 'format' => 0, 'mode' => 'normal', 'style' => '']],
        ];
        $embed = fn (string $id, string $kind, array $data): array => [
            'type' => 'embed', 'version' => 1, 'id' => $id, 'kind' => $kind, 'data' => $data,
        ];

        return ['root' => [
            'type' => 'root', 'version' => 1, 'direction' => null, 'format' => '', 'indent' => 0,
            'children' => [
                $paragraph('Blocks sit between paragraphs.'),
                $embed('3f6c0f7e-8d2a-4c1b-9e5f-1a2b3c4d5e6f', 'callout', ['title' => 'Heads up', 'text' => 'Click the card to edit it.']),
                $embed('9b1d2c3e-4f5a-4b6c-8d7e-0f1a2b3c4d5e', 'legacy', ['note' => 'kept as-is']),
                $paragraph('The legacy block above is not declared by this field.'),
            ],
        ]];
    }

    /** @return list<array<string, mixed>> */
    private function posts(int $authorId): array
    {
        $now = Carbon::now();

        return [
            [
                'title' => 'Hello Tabletop',
                'slug' => 'hello-tabletop',
                'intro' => ['en' => 'First post', 'uk' => 'Перший допис'],
                'published' => true,
                'published_at' => $now->copy()->subMonths(5),
                'views' => 320,
                'rating' => 4.5,
                'author_id' => $authorId,
                'cover_url' => 'https://picsum.photos/seed/hello-tabletop/80',
                'color' => '#2563eb',
                'sections' => [['heading' => 'Welcome', 'body' => 'Welcome to the demo.']],
                'created_at' => $now->copy()->subMonths(5),
            ],
            [
                'title' => 'Designing the admin DSL',
                'slug' => 'designing-the-admin-dsl',
                'intro' => ['en' => 'How the structure DSL works', 'uk' => 'Як працює DSL структури'],
                'body' => ['en' => $this->bodyWithEmbeds(), 'uk' => null],
                'published' => true,
                'published_at' => $now->copy()->subMonths(4),
                'views' => 210,
                'rating' => 4.0,
                'author_id' => $authorId,
                'cover_url' => 'https://picsum.photos/seed/designing-the-admin-dsl/80',
                'color' => '#16a34a',
                'created_at' => $now->copy()->subMonths(4),
            ],
            [
                'title' => 'Server-driven forms',
                'slug' => 'server-driven-forms',
                'published' => true,
                'published_at' => $now->copy()->subMonths(4)->addDays(10),
                'views' => 95,
                'author_id' => $authorId,
                'created_at' => $now->copy()->subMonths(4)->addDays(10),
            ],
            [
                'title' => 'Charts and dashboards',
                'slug' => 'charts-and-dashboards',
                'published' => false,
                'views' => 12,
                'rating' => 3.5,
                'author_id' => $authorId,
                'created_at' => $now->copy()->subMonths(3),
            ],
            [
                'title' => 'Table actions in depth',
                'slug' => 'table-actions-in-depth',
                'published' => true,
                'published_at' => $now->copy()->subMonths(2),
                'views' => 540,
                'rating' => 4.8,
                'author_id' => $authorId,
                'cover_url' => 'https://picsum.photos/seed/table-actions/80',
                'color' => '#f59e0b',
                'sections' => [
                    ['heading' => 'Row actions', 'body' => 'Edit and delete.'],
                    ['heading' => 'Bulk actions', 'body' => 'Selection-driven.'],
                ],
                'created_at' => $now->copy()->subMonths(2),
            ],
            [
                'title' => 'Validation round-trips',
                'slug' => 'validation-round-trips',
                'published' => false,
                'views' => 7,
                'author_id' => $authorId,
                'created_at' => $now->copy()->subMonths(2)->addDays(12),
            ],
            [
                'title' => 'Inertia under the hood',
                'slug' => 'inertia-under-the-hood',
                'published' => true,
                'published_at' => $now->copy()->subMonth(),
                'views' => 130,
                'rating' => 4.2,
                'author_id' => $authorId,
                'created_at' => $now->copy()->subMonth(),
            ],
            [
                'title' => 'Roadmap: relations and uploads',
                'slug' => 'roadmap-relations-and-uploads',
                'intro' => ['en' => 'What lands next', 'uk' => 'Що буде далі'],
                'published' => false,
                'views' => 41,
                'author_id' => $authorId,
                'created_at' => $now->copy()->subDays(6),
            ],
        ];
    }
}
