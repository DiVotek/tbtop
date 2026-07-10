<?php

use Tbtop\Admin\Tests\Fixtures\HeaderActionsPage;

it('serializes headerActions as a page prop alongside title/subtitle', function () {
    $response = $this->get('/admin/header-actions', ['X-Inertia' => 'true']);

    $response->assertOk();
    $props = $response->json('props');

    expect($props['title'])->toBe('Header Actions Page')
        ->and($props['subtitle'])->toBe('Subtitle line')
        ->and($props['headerActions'])->toHaveCount(2)
        ->and($props['headerActions'][0]['name'])->toBe('create')
        ->and($props['headerActions'][0]['options']['spec'])
        ->toBe(['type' => 'visit', 'href' => '/admin/header-actions/create']);
});

it('drops unauthorized header actions from the wire', function () {
    $response = $this->get('/admin/header-actions', ['X-Inertia' => 'true']);

    $names = array_column($response->json('props.headerActions'), 'name');

    expect($names)->not->toContain('export');
});

it('runs a server-handled header action posted directly, without rendering the page first', function () {
    // Regression: header actions with ->handle() are only registered as a side
    // effect of calling Page::headerActions($s). ResolvedPage::fromRequest()
    // used to build $s from view() alone, so a POST straight to actions/{name}
    // (no prior GET render in this request) 404'd even though the action exists.
    $response = $this->postJson('/admin/header-actions/actions/refresh');

    $response->assertOk()->assertExactJson([
        'effects' => [
            ['kind' => 'notify', 'message' => 'Refreshed', 'level' => 'success'],
        ],
    ]);
    expect(HeaderActionsPage::$refreshed)->toBeTrue();
});
