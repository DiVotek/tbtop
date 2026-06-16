<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for the inline-editable `published` toggle column on the
 * posts index table — persistence plus the published_at domain side-effect.
 */
class EditableColumnTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_toggle_publishes_post_and_sets_published_at(): void
    {
        $post = $this->makePost(['published' => false, 'published_at' => null]);

        $response = $this->postJson(
            '/admin/posts/cells/posts/published',
            ['payload' => ['id' => $post->id, 'value' => true]],
        );

        $response->assertOk();
        $fresh = Post::find($post->id);
        $this->assertTrue($fresh->published);
        $this->assertNotNull($fresh->published_at, 'published_at should be stamped on publish');
    }

    public function test_toggle_unpublishes_post_and_clears_published_at(): void
    {
        $post = $this->makePost(['published' => true, 'published_at' => now()]);

        $this->postJson(
            '/admin/posts/cells/posts/published',
            ['payload' => ['id' => $post->id, 'value' => false]],
        )->assertOk();

        $fresh = Post::find($post->id);
        $this->assertFalse($fresh->published);
        $this->assertNull($fresh->published_at, 'published_at should be cleared on unpublish');
    }

    public function test_toggle_returns_notify_and_refresh_effects_from_onsave_closure(): void
    {
        $post = $this->makePost(['published' => false]);

        $response = $this->postJson(
            '/admin/posts/cells/posts/published',
            ['payload' => ['id' => $post->id, 'value' => true]],
        );

        $response->assertOk();
        $effects = $response->json('effects');
        $this->assertContains(
            ['kind' => 'notify', 'message' => 'Post published', 'level' => 'success'],
            $effects,
        );
        $this->assertContains(['kind' => 'refreshTable', 'table' => 'posts'], $effects);
    }

    public function test_cell_endpoint_requires_auth(): void
    {
        $this->app['auth']->forgetGuards();
        $post = $this->makePost();

        $this->postJson(
            '/admin/posts/cells/posts/published',
            ['payload' => ['id' => $post->id, 'value' => true]],
        )->assertUnauthorized();
    }

    /** @param  array<string, mixed>  $overrides */
    private function makePost(array $overrides = []): Post
    {
        static $i = 0;
        $i++;

        return Post::create([
            'title' => ['en' => "Post {$i}"],
            'slug' => "post-{$i}",
            ...$overrides,
        ]);
    }
}
