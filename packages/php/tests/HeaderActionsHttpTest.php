<?php

it('serializes headerActions as a page prop alongside title/subtitle', function () {
    $response = $this->get('/admin/header-actions', ['X-Inertia' => 'true']);

    $response->assertOk();
    $props = $response->json('props');

    expect($props['title'])->toBe('Header Actions Page')
        ->and($props['subtitle'])->toBe('Subtitle line')
        ->and($props['headerActions'])->toHaveCount(1)
        ->and($props['headerActions'][0]['name'])->toBe('create')
        ->and($props['headerActions'][0]['options']['spec'])
        ->toBe(['type' => 'visit', 'href' => '/admin/header-actions/create']);
});

it('drops unauthorized header actions from the wire', function () {
    $response = $this->get('/admin/header-actions', ['X-Inertia' => 'true']);

    $names = array_column($response->json('props.headerActions'), 'name');

    expect($names)->not->toContain('export');
});
