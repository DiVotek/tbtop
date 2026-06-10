<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RepeaterConditionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_post_edit_sections_repeater_carries_item_local_hidden_if_on_url(): void
    {
        $post = Post::create(['title' => ['en' => 'Demo'], 'slug' => 'demo']);

        $this->get("/admin/posts/{$post->id}/edit")
            ->assertOk()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/page', false);

                $encoded = json_encode($page->toArray()['props']['structure']);

                // sections repeater sub-field url carries hiddenIf: neq on type
                $this->assertStringContainsString('"hiddenIf"', (string) $encoded);
                $this->assertStringContainsString('"field":"type"', (string) $encoded);
                $this->assertStringContainsString('"op":"neq"', (string) $encoded);
                $this->assertStringContainsString('"value":"link"', (string) $encoded);
            });
    }
}
