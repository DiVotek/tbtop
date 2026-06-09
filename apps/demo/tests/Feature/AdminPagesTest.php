<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_admin_page_renders_the_admin_page_component(): void
    {
        $post = $this->makePost();
        $urls = [
            '/admin/dashboard',
            '/admin/posts',
            '/admin/posts/new',
            "/admin/posts/{$post->id}/edit",
            '/admin/settings',
        ];

        foreach ($urls as $url) {
            $this->get($url)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component('admin/page', false));
        }
    }

    public function test_edit_page_record_carries_the_post_data(): void
    {
        $post = $this->makePost([
            'intro' => ['en' => 'Hi', 'uk' => 'Привіт'],
            'sections' => [['heading' => 'One', 'body' => 'Body']],
        ]);

        $this->get("/admin/posts/{$post->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/page', false)
                ->where('data.post.title', $post->title)
                ->where('data.post.intro.uk', 'Привіт')
                ->where('data.post.sections.0.heading', 'One'));
    }

    public function test_posts_table_endpoint_returns_rows_and_total(): void
    {
        $this->makePost(['title' => 'Alpha']);
        $this->makePost(['title' => 'Beta']);

        $response = $this->getJson('/admin/posts/tables/posts')
            ->assertOk()
            ->assertJsonStructure(['data' => ['data', 'total']]);

        $this->assertSame(2, $response->json('data.total'));
    }

    public function test_posts_table_search_filters_by_title(): void
    {
        $this->makePost(['title' => 'Needle in haystack']);
        $this->makePost(['title' => 'Other']);

        $response = $this->getJson('/admin/posts/tables/posts?search=Needle')->assertOk();

        $this->assertSame(1, $response->json('data.total'));
        $this->assertSame('Needle in haystack', $response->json('data.data.0.title'));
    }

    public function test_dashboard_chart_endpoints_return_aggregates(): void
    {
        $this->makePost(['published' => true, 'created_at' => now()->subMonth()]);
        $this->makePost(['published' => false, 'created_at' => now()]);

        $byMonth = $this->getJson('/admin/dashboard/data/byMonth')->assertOk();
        $this->assertCount(2, $byMonth->json('data'));
        $this->assertArrayHasKey('month', $byMonth->json('data.0'));
        $this->assertArrayHasKey('count', $byMonth->json('data.0'));

        $byStatus = $this->getJson('/admin/dashboard/data/byStatus')->assertOk();
        $statuses = array_column($byStatus->json('data'), 'total', 'status');
        $this->assertSame(['Draft' => 1, 'Published' => 1], $statuses);
    }

    public function test_post_edit_form_submit_updates_the_post(): void
    {
        $author = User::factory()->create();
        $post = $this->makePost();

        $this->postJson("/admin/posts/{$post->id}/edit/forms/post", [
            'title' => 'Updated title',
            'intro' => ['en' => 'Updated', 'uk' => 'Оновлено'],
            'slug' => $post->slug,
            'body' => 'Updated body',
            'published' => true,
            'published_at' => '2026-01-15 10:00:00',
            'rating' => 4.5,
            'author_id' => $author->id,
            'sections' => [['heading' => 'New section', 'body' => 'Text']],
        ])->assertRedirect();

        $post->refresh();
        $this->assertSame('Updated title', $post->title);
        $this->assertSame('Оновлено', $post->intro['uk']);
        $this->assertTrue($post->published);
        $this->assertSame(4.5, $post->rating);
        $this->assertSame($author->id, $post->author_id);
        $this->assertSame('New section', $post->sections[0]['heading']);
    }

    public function test_post_edit_form_submit_rejects_invalid_payload(): void
    {
        $post = $this->makePost();

        $this->postJson("/admin/posts/{$post->id}/edit/forms/post", [
            'title' => '',
            'slug' => 'Has Spaces!',
            'rating' => 9,
        ])->assertStatus(422)->assertJsonValidationErrors(['title', 'slug', 'rating']);
    }

    public function test_post_create_form_submit_creates_and_redirects_to_edit(): void
    {
        $response = $this->postJson('/admin/posts/new/forms/post', [
            'title' => 'Brand new',
            'slug' => 'brand-new',
            'published' => false,
            'sections' => [],
        ]);

        $post = Post::where('slug', 'brand-new')->firstOrFail();
        $response->assertRedirect("/admin/posts/{$post->id}/edit");
        $this->assertSame('Brand new', $post->title);
    }

    public function test_create_rejects_duplicate_slug(): void
    {
        $this->makePost(['slug' => 'taken']);

        $this->postJson('/admin/posts/new/forms/post', [
            'title' => 'Dup',
            'slug' => 'taken',
        ])->assertStatus(422)->assertJsonValidationErrors(['slug']);
    }

    public function test_row_edit_action_redirects_to_the_row_edit_page(): void
    {
        $post = $this->makePost();

        $this->postJson('/admin/posts/actions/edit', [
            'payload' => ['row' => ['id' => $post->id]],
        ])->assertOk()->assertJsonPath('effects.0', [
            'kind' => 'redirect',
            'href' => "/admin/posts/{$post->id}/edit",
        ]);
    }

    public function test_row_delete_action_deletes_the_post(): void
    {
        $post = $this->makePost();

        $this->postJson('/admin/posts/actions/delete', [
            'payload' => ['row' => ['id' => $post->id]],
        ])->assertOk()->assertJsonPath('effects.0.kind', 'notify');

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_bulk_delete_action_deletes_the_selection(): void
    {
        $first = $this->makePost();
        $second = $this->makePost();
        $kept = $this->makePost();

        $this->postJson('/admin/posts/actions/delete-selected', [
            'payload' => ['selection' => [$first->id, $second->id]],
        ])->assertOk()->assertJsonPath('effects.0.message', 'Deleted 2 post(s)');

        $this->assertSame([$kept->id], Post::pluck('id')->all());
    }

    public function test_edit_page_delete_action_deletes_and_redirects(): void
    {
        $post = $this->makePost();

        $this->postJson("/admin/posts/{$post->id}/edit/actions/delete", [
            'payload' => [],
        ])->assertOk()->assertJsonPath('effects.1', [
            'kind' => 'redirect',
            'href' => '/admin/posts',
        ]);

        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_settings_form_submit_updates_the_singleton(): void
    {
        $this->postJson('/admin/settings/forms/settings', [
            'site_name' => 'Renamed site',
            'tagline' => 'Now with Inertia',
            'maintenance_mode' => true,
            'max_upload_mb' => 25,
            'launch_date' => '2026-07-01 00:00:00',
        ])->assertRedirect();

        $settings = Setting::sole();
        $this->assertSame('Renamed site', $settings->site_name);
        $this->assertTrue($settings->maintenance_mode);
        $this->assertSame(25, $settings->max_upload_mb);
    }

    /** @param  array<string, mixed>  $overrides */
    private function makePost(array $overrides = []): Post
    {
        static $i = 0;
        $i++;

        return Post::create([
            'title' => "Post {$i}",
            'slug' => "post-{$i}",
            ...$overrides,
        ]);
    }
}
