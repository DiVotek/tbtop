<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for the searchable+creatable author select on the post edit form.
 * Scenario 6 from slice E.
 */
class SelectCreatableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_author_select_structure_carries_create_config(): void
    {
        $post = $this->makePost();

        $this->get("/admin/posts/{$post->id}/edit")
            ->assertOk()
            ->assertInertia(function ($page): void {
                $props = $page->toArray()['props'];
                $structure = json_decode((string) json_encode($props['structure']), true);
                $authorField = $this->findFieldNode($structure, 'author_id');

                $this->assertNotNull($authorField, 'Expected author_id field in structure');
                $this->assertArrayHasKey('create', $authorField['options'] ?? []);
                $this->assertArrayHasKey('fields', $authorField['options']['create'] ?? []);
                $this->assertTrue(
                    ($authorField['options']['searchable'] ?? false) === true,
                    'author_id should be searchable',
                );
            });
    }

    public function test_create_author_endpoint_creates_user_and_returns_value_label(): void
    {
        $post = $this->makePost();

        $response = $this->postJson(
            "/admin/posts/{$post->id}/edit/select-create/author_id",
            ['name' => 'New Author', 'email' => 'newauthor@example.com'],
        );

        $response->assertOk()
            ->assertJsonStructure(['value', 'label']);

        $value = $response->json('value');
        $label = $response->json('label');

        $this->assertNotNull($value, 'value must be set');
        $this->assertStringContainsString('New Author', $label);

        // The user was actually created
        $this->assertDatabaseHas('users', ['name' => 'New Author']);
    }

    public function test_create_author_endpoint_validates_required_fields(): void
    {
        $post = $this->makePost();

        $this->postJson(
            "/admin/posts/{$post->id}/edit/select-create/author_id",
            [],
        )->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_create_author_endpoint_requires_auth(): void
    {
        $this->app['auth']->forgetGuards();
        $post = $this->makePost();

        // The panel guard (auth:web) rejects JSON guests with 401 — it runs
        // before RequireFullAuth, which used to redirect.
        $this->postJson(
            "/admin/posts/{$post->id}/edit/select-create/author_id",
            ['name' => 'Bob', 'email' => 'bob@example.com'],
        )->assertUnauthorized();
    }

    /**
     * Recursively find a field node by its name in the serialized structure tree.
     *
     * @param  array<string, mixed>  $node
     * @return array<string, mixed>|null
     */
    private function findFieldNode(array $node, string $name): ?array
    {
        if (($node['name'] ?? null) === $name) {
            return $node;
        }
        foreach (['children', 'fields'] as $key) {
            $items = $node['options'][$key] ?? [];
            foreach ($items as $child) {
                if (is_array($child)) {
                    $found = $this->findFieldNode($child, $name);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
        }

        return null;
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
