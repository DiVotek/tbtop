<?php

namespace Tests\Feature;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PostFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_published_state_yields_published_post_with_datetime_title(): void
    {
        $post = Post::factory()->published()->create();

        $this->assertTrue($post->published);
        $this->assertInstanceOf(Carbon::class, $post->published_at);
        $this->assertIsArray($post->title);
        $this->assertArrayHasKey('en', $post->title);
        $this->assertArrayHasKey('uk', $post->title);
    }
}
