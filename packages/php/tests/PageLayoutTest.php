<?php

it('includes layout:admin in page props by default', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    expect($response->json('props.layout'))->toBe('admin');
});

it('includes layout:center in page props when overridden', function () {
    $response = $this->get('/admin/center', ['X-Inertia' => 'true']);

    $response->assertOk();
    expect($response->json('props.layout'))->toBe('center');
});

it('throws InvalidArgumentException when a page returns an invalid layout value', function () {
    $this->withoutExceptionHandling();
    $this->get('/admin/invalid-layout', ['X-Inertia' => 'true']);
})->throws(InvalidArgumentException::class, "Invalid page layout 'fullscreen'");

it('includes subtitle in page props when the page overrides it', function () {
    $response = $this->get('/admin/center', ['X-Inertia' => 'true']);

    $response->assertOk();
    expect($response->json('props.subtitle'))->toBe('Centered subtitle');
});

it('omits subtitle from page props when the page does not override it', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    expect($response->json('props'))->not->toHaveKey('subtitle');
});
