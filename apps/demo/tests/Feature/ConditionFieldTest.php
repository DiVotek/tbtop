<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ConditionFieldTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_post_edit_structure_carries_hidden_if_on_published_at(): void
    {
        $post = Post::create(['title' => ['en' => 'Test'], 'slug' => 'test']);

        $this->get("/admin/posts/{$post->id}/edit")
            ->assertOk()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/page', false);

                $encoded = json_encode($page->toArray()['props']['structure']);

                // published_at field carries hiddenIf: eq on published field
                $this->assertStringContainsString('"hiddenIf"', (string) $encoded);
                $this->assertStringContainsString('"field":"published"', (string) $encoded);
                $this->assertStringContainsString('"op":"eq"', (string) $encoded);
            });
    }

    public function test_post_edit_structure_carries_disabled_if_combinator_on_rating(): void
    {
        $post = Post::create(['title' => ['en' => 'Test'], 'slug' => 'test-2']);

        $this->get("/admin/posts/{$post->id}/edit")
            ->assertOk()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/page', false);

                $encoded = json_encode($page->toArray()['props']['structure']);

                // rating field carries disabledIf: not(truthy(published))
                $this->assertStringContainsString('"disabledIf"', (string) $encoded);
                $this->assertStringContainsString('"op":"not"', (string) $encoded);
                $this->assertStringContainsString('"op":"truthy"', (string) $encoded);
            });
    }
}
