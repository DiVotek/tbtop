<?php

namespace Tests\Feature;

use App\Http\Middleware\DemoStylePreset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DemoStylePresetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_a_valid_style_lands_in_the_shared_prop_and_the_html_class(): void
    {
        $this->get('/admin/posts?style=lyra')
            ->assertOk()
            ->assertSessionHas(DemoStylePreset::SESSION_KEY, 'lyra')
            ->assertSee('style-preset-lyra', false)
            ->assertInertia(fn (Assert $page) => $page->where('tbtop.appearance.stylePreset', 'lyra'));
    }

    public function test_the_style_persists_across_navigation(): void
    {
        $this->get('/admin/posts?style=maia');

        $this->get('/admin/dashboard')
            ->assertOk()
            ->assertSee('style-preset-maia', false)
            ->assertInertia(fn (Assert $page) => $page->where('tbtop.appearance.stylePreset', 'maia'));
    }

    public function test_an_unknown_style_is_ignored(): void
    {
        $this->get('/admin/posts?style=evil')
            ->assertOk()
            ->assertSessionMissing(DemoStylePreset::SESSION_KEY)
            ->assertSee('style-preset-vega', false)
            ->assertInertia(fn (Assert $page) => $page->missing('tbtop.appearance.stylePreset'));
    }

    public function test_an_unknown_style_keeps_an_earlier_pick(): void
    {
        $this->get('/admin/posts?style=nova');

        $this->get('/admin/posts?style=evil')
            ->assertSessionHas(DemoStylePreset::SESSION_KEY, 'nova')
            ->assertInertia(fn (Assert $page) => $page->where('tbtop.appearance.stylePreset', 'nova'));
    }

    public function test_the_switcher_marks_the_current_style(): void
    {
        $html = $this->get('/admin/posts?style=sera')->assertOk()->getContent();

        $this->assertMatchesRegularExpression('#<a href="[^"]*/admin/posts\?style=sera"[^>]*aria-current="true"[^>]*>sera</a>#', $html);
        $this->assertMatchesRegularExpression('#<a href="[^"]*/admin/posts\?style=vega"(?![^>]*aria-current)[^>]*>vega</a>#', $html);
    }

    public function test_the_switcher_is_not_on_pages_outside_the_panel_middleware(): void
    {
        $this->app['auth']->forgetGuards();

        $this->get('/admin/login')->assertOk()->assertDontSee('demo-style-switcher', false);
    }
}
