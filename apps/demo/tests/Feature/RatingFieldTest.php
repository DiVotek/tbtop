<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RatingFieldTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_post_create_form_structure_carries_rating_field_with_kind_and_max(): void
    {
        $this->get('/admin/posts/new')
            ->assertOk()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/page', false);
                $page->where('structure.options.children.0.options.children.0.options.children.0.name', 'title');

                // Walk the structure to find the rating field.
                $structure = $page->toArray()['props']['structure'];
                $ratingNode = $this->findNodeByName($structure, 'rating');

                $this->assertNotNull($ratingNode, 'rating field not found in structure');
                $this->assertSame('rating', $ratingNode['kind']);
                $this->assertArrayHasKey('max', $ratingNode['options']);
            });
    }

    /** @param  array<string, mixed>  $node */
    private function findNodeByName(array $node, string $name): ?array
    {
        if (($node['name'] ?? null) === $name) {
            return $node;
        }
        foreach (['children', 'fields', 'tabs'] as $key) {
            $items = $node['options'][$key] ?? [];
            if (! is_array($items)) {
                continue;
            }
            foreach ($items as $child) {
                if (! is_array($child)) {
                    continue;
                }
                $found = $this->findNodeByName($child, $name);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }
}
