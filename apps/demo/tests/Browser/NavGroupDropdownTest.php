<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Http\Request;
use Tbtop\Admin\Navigation\NavBuilder;
use Tbtop\Admin\Panels\ChromeSerializer;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Panels\PanelRegistry;

beforeEach(function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']));
    $panel = new CurrentPanel(app(PanelRegistry::class)->get('admin'));
    // Pest Browser flushes global Inertia shares before every HTTP request,
    // so provide the panel chrome through request middleware in this test.
    app()->instance(HandleInertiaRequests::class, new class($panel) extends HandleInertiaRequests
    {
        public function __construct(private readonly CurrentPanel $panel) {}

        public function share(Request $request): array
        {
            return [...parent::share($request), 'tbtop' => [
                'nav' => NavBuilder::build($this->panel),
                'chrome' => ChromeSerializer::forPanel($this->panel),
                'navigation' => $this->panel->navigation(),
                'prefix' => $this->panel->pathPrefix(),
                'apiBase' => $this->panel->pathPrefix().'/api',
            ]];
        }
    });
});

it('releases the modal navigation menu after an Inertia visit', function () {
    $page = visit('/admin/dashboard')
        ->resize(1440, 900);

    $page->assertVisible('@nav-group-trigger-Content')
        ->click('@nav-group-trigger-Content')
        ->assertVisible('@nav-group-menu-Content')
        ->click('[data-testid="nav-group-menu-Content"] a[href="/admin/posts"]')
        ->assertPathIs('/admin/posts')
        ->assertMissing('@nav-group-menu-Content')
        ->assertScript(<<<'JS'
            () => getComputedStyle(document.body).pointerEvents !== 'none'
                && getComputedStyle(document.body).overflow !== 'hidden'
        JS)
        ->click('@nav-group-trigger-Overview')
        ->assertVisible('@nav-group-menu-Overview');

    $page->keys('@nav-group-trigger-Overview', 'Escape')
        ->assertMissing('@nav-group-menu-Overview')
        ->assertScript(<<<'JS'
            async () => {
                const probe = document.createElement('div');
                probe.style.height = '200vh';
                document.body.append(probe);
                const before = window.scrollY;
                window.scrollTo(0, document.documentElement.scrollHeight);
                await new Promise((resolve) => requestAnimationFrame(resolve));
                const didScroll = window.scrollY > before;
                probe.remove();
                window.scrollTo(0, before);

                return didScroll;
            }
        JS)
        ->assertNoSmoke();
});
