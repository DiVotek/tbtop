<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TitleTranslatableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_title_node_is_translatable_on_the_edit_page_wire(): void
    {
        $post = $this->makePost();

        $response = $this->get("/admin/posts/{$post->id}/edit");
        $response->assertOk();

        $props = [];
        $response->assertInertia(function ($page) use (&$props) {
            $props = $page->toArray()['props'];

            return $page->component('admin/page', false);
        });

        $title = $this->findNodeByName($props['structure'], 'title');
        $this->assertNotNull($title, 'title node missing from structure');
        $this->assertTrue($title['options']['translatable'] ?? null);

        $this->assertSame(['en' => 'Hello', 'uk' => 'Привіт'], $props['data']['post']['title']);
    }

    public function test_submit_accepts_a_locale_map_title(): void
    {
        $post = $this->makePost();

        $response = $this->from("/admin/posts/{$post->id}/edit")
            ->post("/admin/posts/{$post->id}/edit/forms/post", [
                'title' => ['en' => 'Edited', 'uk' => null],
                'slug' => $post->slug,
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $this->assertSame('Edited', $post->fresh()->title['en']);
    }

    public function test_legacy_scalar_title_is_normalized_to_a_locale_map_on_the_wire(): void
    {
        // Rows written before the translatable wave (or by old bugs) carry a
        // plain string in the JSON column. The wire record must still match
        // the declared field shape, else the client round-trips the scalar
        // and validation rejects it ("title must be an array").
        $author = User::factory()->create();
        $post = Post::create([
            'title' => ['en' => 'tmp', 'uk' => null],
            'slug' => 'legacy-'.uniqid(),
            'published' => true,
            'author_id' => $author->id,
        ]);
        // Bypass the cast to simulate the legacy scalar payload.
        \DB::table('posts')->where('id', $post->id)->update(['title' => json_encode('Plain title')]);

        $response = $this->get("/admin/posts/{$post->id}/edit");
        $response->assertOk();

        $props = [];
        $response->assertInertia(function ($page) use (&$props) {
            $props = $page->toArray()['props'];

            return $page->component('admin/page', false);
        });

        $this->assertSame(['en' => 'Plain title', 'uk' => null], $props['data']['post']['title']);
    }

    private function makePost(): Post
    {
        $author = User::factory()->create();

        return Post::create([
            'title' => ['en' => 'Hello', 'uk' => 'Привіт'],
            'slug' => 'hello-'.uniqid(),
            'published' => true,
            'author_id' => $author->id,
        ]);
    }

    /** @param array<string, mixed> $node */
    private function findNodeByName(array $node, string $name): ?array
    {
        if (($node['name'] ?? null) === $name) {
            return $node;
        }
        $children = $node['options']['children'] ?? $node['options']['fields'] ?? [];
        foreach ((array) $children as $child) {
            if (is_array($child)) {
                $found = $this->findNodeByName($child, $name);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }
}
