<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Volume seeder for performance checks: tables, search, tabs, charts.
 *
 * Usage: BULK_POSTS=10000 php artisan db:seed --class="Database\Seeders\BulkPostsSeeder"
 */
class BulkPostsSeeder extends Seeder
{
    private const CHUNK = 500;

    private const TOPICS = ['charts', 'tables', 'forms', 'uploads', 'panels', 'filters', 'media', 'auth'];

    public function run(): void
    {
        $count = max(1, (int) env('BULK_POSTS', 5000));
        $authorId = User::where('email', 'admin@admin.com')->value('id');

        Post::where('slug', 'like', 'perf-post-%')->delete();

        mt_srand(20260611);
        $now = Carbon::now();

        foreach (array_chunk(range(1, $count), self::CHUNK) as $chunk) {
            DB::table('posts')->insert(array_map(
                fn (int $i) => $this->post($i, $authorId, $now),
                $chunk,
            ));
        }

        $this->command?->info("Seeded {$count} perf posts.");
    }

    /** @return array<string, mixed> */
    private function post(int $i, ?int $authorId, Carbon $now): array
    {
        $createdAt = $now->copy()->subMinutes(mt_rand(0, 60 * 24 * 365));
        $published = mt_rand(1, 100) <= 70;
        $topic = self::TOPICS[$i % count(self::TOPICS)];

        return [
            'title' => json_encode([
                'en' => "Perf post {$i}: deep dive into {$topic}",
                'uk' => "Тестовий допис {$i}: огляд {$topic}",
            ]),
            'slug' => sprintf('perf-post-%06d', $i),
            'intro' => $i % 3 === 0
                ? json_encode(['en' => "Generated intro {$i}", 'uk' => "Згенерований вступ {$i}"])
                : null,
            'published' => $published,
            'published_at' => $published ? $createdAt->copy()->addHours(mt_rand(1, 72)) : null,
            'views' => mt_rand(0, 5000),
            'rating' => mt_rand(0, 100) < 80 ? mt_rand(10, 50) / 10 : null,
            'metadata' => '{}',
            'author_id' => $authorId,
            'sections' => $i % 5 === 0
                ? json_encode([['heading' => "Section {$i}", 'body' => 'Generated body.']])
                : null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }
}
