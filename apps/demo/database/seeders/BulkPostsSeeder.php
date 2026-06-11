<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Volume seeder for performance checks: tables, search, tabs, charts.
 *
 * Usage: BULK_POSTS=10000 php artisan db:seed --class="Database\Seeders\BulkPostsSeeder"
 */
class BulkPostsSeeder extends Seeder
{
    private const CHUNK = 500;

    public function run(): void
    {
        $count = max(1, (int) env('BULK_POSTS', 5000));
        $authorId = User::where('email', 'admin@admin.com')->value('id');

        Post::where('slug', 'like', 'perf-post-%')->delete();

        $index = 0;
        foreach (array_chunk(range(1, $count), self::CHUNK) as $chunk) {
            $rows = Post::factory()
                ->count(count($chunk))
                ->make()
                ->map(function (Post $post) use (&$index, $authorId) {
                    $index++;

                    return $this->toDbRow($post, $index, $authorId);
                })
                ->all();

            DB::table('posts')->insert($rows);
        }

        $this->command?->info("Seeded {$count} perf posts.");
    }

    /**
     * Map a factory-built Post instance to a raw DB row for bulk insert.
     *
     * JSON columns must be encoded; slug gets the perf-post- prefix.
     *
     * @return array<string, mixed>
     */
    private function toDbRow(Post $post, int $index, ?int $authorId): array
    {
        $createdAt = $post->created_at;
        $published = $post->published;

        return [
            'title' => json_encode($post->title),
            'slug' => sprintf('perf-post-%06d', $index),
            'intro' => $post->intro !== null ? json_encode($post->intro) : null,
            'body' => null,
            'published' => $published,
            'published_at' => $published && $post->published_at
                ? $post->published_at->toDateTimeString()
                : null,
            'views' => $post->views,
            'rating' => $post->rating,
            'metadata' => '{}',
            'author_id' => $authorId,
            'sections' => $post->sections !== null ? json_encode($post->sections) : null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }
}
