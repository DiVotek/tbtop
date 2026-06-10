<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BundleSplitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_admin_pages_render_using_the_admin_root_view(): void
    {
        $response = $this->get('/admin/dashboard');

        $response->assertOk();
        // View name, not markup: asset filenames differ between dev
        // (admin.tsx via hot file) and production build (hashed).
        $response->assertViewIs('admin');
    }

    public function test_public_welcome_page_renders_using_the_default_root_view(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertViewIs('app');
    }

    public function test_admin_blade_includes_theme_class_from_cookie(): void
    {
        $this->withCookie('tbtop_theme', 'dark');

        $response = $this->get('/admin/dashboard');

        $response->assertOk();
        $this->assertStringContainsString('class="dark"', $response->getContent());
    }

    public function test_admin_blade_has_no_dark_class_when_theme_cookie_is_light(): void
    {
        $this->withCookie('tbtop_theme', 'light');

        $response = $this->get('/admin/dashboard');

        $response->assertOk();
        $this->assertStringNotContainsString('class="dark"', $response->getContent());
    }
}
