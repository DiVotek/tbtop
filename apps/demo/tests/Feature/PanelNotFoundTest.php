<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PanelNotFoundTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_unknown_url_under_the_panel_prefix_renders_the_error_page_in_the_panel_chrome(): void
    {
        $this->get('/admin/definitely/not/a/page')
            ->assertNotFound()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/error', false)
                    ->where('status', 404)
                    ->where('title', 'Page not found')
                    ->has('message')
                    ->where('tbtop.panel', 'admin')
                    ->has('tbtop.nav');
            });
    }

    public function test_page_whose_view_throws_model_not_found_renders_the_same_error_page(): void
    {
        $this->get('/admin/posts/999999/edit')
            ->assertNotFound()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/error', false)
                    ->where('status', 404)
                    ->where('tbtop.panel', 'admin');
            });
    }

    public function test_inertia_xhr_for_an_unknown_url_receives_an_inertia_response(): void
    {
        // Without the current asset version Inertia answers 409 before routing.
        $version = app(HandleInertiaRequests::class)->version($this->app['request']);
        $headers = ['X-Inertia' => 'true', 'X-Inertia-Version' => $version];
        $response = $this->get('/admin/definitely/not/a/page', $headers)
            ->assertNotFound()
            ->assertHeader('X-Inertia', 'true');

        $this->assertSame('admin/error', $response->json('component'));
    }

    public function test_url_outside_the_panel_prefix_is_a_plain_laravel_404(): void
    {
        $this->get('/definitely/not/a/page')
            ->assertNotFound()
            ->assertHeaderMissing('X-Inertia')
            ->assertDontSee('admin/error');
    }

    public function test_guest_404_on_a_public_page_route_renders_the_chrome_less_center_layout(): void
    {
        // LoginPage is reachable without the panel's auth guard; a 404 raised
        // from one of its own routes (e.g. an undefined data source) must not
        // leak panel chrome to a visitor who was never authenticated.
        $this->post('/logout');

        $this->get('/admin/login/data/bogus')
            ->assertNotFound()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/error', false)
                    ->where('status', 404)
                    ->where('layout', 'center');
            });
    }

    public function test_authenticated_404_on_a_public_page_route_still_gets_the_panel_chrome(): void
    {
        $this->get('/admin/login/data/bogus')
            ->assertNotFound()
            ->assertInertia(function (Assert $page) {
                $page->component('admin/error', false)
                    ->where('status', 404)
                    ->where('layout', 'admin')
                    ->where('tbtop.panel', 'admin')
                    ->has('tbtop.nav');
            });
    }

    public function test_unknown_url_json_request_receives_a_plain_json_404(): void
    {
        $response = $this->getJson('/admin/definitely/not/a/page')
            ->assertNotFound()
            ->assertHeaderMissing('X-Inertia');

        $this->assertJson($response->getContent());
        $this->assertStringNotContainsString('admin/error', $response->getContent());
    }
}
