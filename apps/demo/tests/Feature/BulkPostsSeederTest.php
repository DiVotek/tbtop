<?php

namespace Tests\Feature;

use App\Models\Post;
use Database\Seeders\BulkPostsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkPostsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_seeder_inserts_exact_count_and_is_idempotent(): void
    {
        putenv('BULK_POSTS=50');

        $this->seed(BulkPostsSeeder::class);
        $this->assertSame(50, Post::where('slug', 'like', 'perf-post-%')->count());

        // Re-run: cleanup + re-insert; still exactly 50.
        $this->seed(BulkPostsSeeder::class);
        $this->assertSame(50, Post::where('slug', 'like', 'perf-post-%')->count());

        putenv('BULK_POSTS');
    }
}
