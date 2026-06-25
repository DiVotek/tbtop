<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

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

        Setting::firstOrCreate([]);
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
