<?php

declare(strict_types=1);

use App\Models\Post;
use App\Models\User;

// Visual regression for M-90: recharts wrote chart-color var() strings as SVG
// presentation attributes, where var() does NOT resolve — so series rendered
// black and never tracked the theme. The fix resolves --chart-N at runtime and
// re-resolves on the .dark class flip. happy-dom can't compute SVG paint, so this
// drives a real browser per theme and reads the rendered fill back.

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => 'admin']);
    // Guarantee both donut buckets and several bar time-buckets exist.
    Post::factory()->count(8)->create(['published' => true]);
    Post::factory()->count(5)->create(['published' => false, 'published_at' => null]);
    $this->actingAs($this->admin);
});

// Reads the painted fill of the first bar/donut path. A resolved oklch/rgb proves
// the var() was resolved; the unresolved bug leaves the SVG default (black).
const CHART_FILL_PROBE = <<<'JS'
() => {
    const el = document.querySelector('.recharts-rectangle, .recharts-sector');
    if (!el) { return 'NO_CHART_PATH'; }
    return getComputedStyle(el).fill;
}
JS;

function assertResolvedChartFill(string $fill, string $theme): void
{
    expect($fill)->not->toBe('NO_CHART_PATH', "no chart path rendered in {$theme} mode");
    // The literal var() string never survives as a computed value; if recharts had
    // emitted it as an SVG attr it would fall back to the default black instead.
    expect($fill)->not->toContain('var(--chart', "chart fill kept the literal var() in {$theme}");
    expect($fill)->not->toBe('rgb(0, 0, 0)', "chart fill fell back to black in {$theme} mode");
    expect($fill)->not->toBe('none');
}

it('paints resolved chart colors in light mode and captures the dashboard', function () {
    $fill = visit('/admin/dashboard')
        ->inLightMode()
        ->assertVisible('#app main')
        ->assertVisible('.recharts-bar')
        ->screenshot(filename: 'dashboard-light')
        ->assertNoSmoke()
        ->script(CHART_FILL_PROBE);

    assertResolvedChartFill($fill, 'light');
});

it('paints resolved chart colors in dark mode and captures the dashboard', function () {
    $fill = visit('/admin/dashboard')
        ->inDarkMode()
        ->assertVisible('#app main')
        ->assertVisible('.recharts-bar')
        ->screenshot(filename: 'dashboard-dark')
        ->assertNoSmoke()
        ->script(CHART_FILL_PROBE);

    assertResolvedChartFill($fill, 'dark');
});

// The demo's shadcn presets give charts the same palette in both modes, so two
// page loads can't tell a re-resolve from a stale colour. Instead, flip `.dark`
// live under a stylesheet with its own dark palette: the painted fill must follow.
const DARK_FLIP_PROBE = <<<'JS'
async () => {
    const palette = ['rgb(11, 22, 33)', 'rgb(44, 55, 66)', 'rgb(77, 88, 99)', 'rgb(111, 122, 133)', 'rgb(144, 155, 166)'];
    const style = document.createElement('style');
    style.textContent = 'html.dark {' + palette.map((c, i) => `--chart-${i + 1}: ${c};`).join(' ') + '}';
    document.head.appendChild(style);
    document.documentElement.classList.add('dark');
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const el = document.querySelector('.recharts-rectangle, .recharts-sector');
    const fill = el ? getComputedStyle(el).fill : 'NO_CHART_PATH';
    return { fill, palette };
}
JS;

it('re-resolves chart colors when the theme flips to dark', function () {
    $page = visit('/admin/dashboard')
        ->inLightMode()
        ->assertVisible('.recharts-bar');

    $light = $page->script(CHART_FILL_PROBE);
    $flip = $page->script(DARK_FLIP_PROBE);

    assertResolvedChartFill($light, 'light');
    expect($flip['palette'])->toContain($flip['fill'])
        ->and($flip['fill'])->not->toBe($light);
});

it('captures the richtext toolbar in light and dark mode for review', function () {
    Post::factory()->create(['title' => ['en' => 'Toolbar review'], 'slug' => 'toolbar-review']);

    visit('/admin/playground')
        ->inLightMode()
        ->assertVisible('#app main')
        ->screenshot(filename: 'richtext-light')
        ->assertNoSmoke();

    visit('/admin/playground')
        ->inDarkMode()
        ->assertVisible('#app main')
        ->screenshot(filename: 'richtext-dark')
        ->assertNoSmoke();
});
