<?php

use Tbtop\Admin\Tests\Fixtures\LiveRegionPage;
use Tbtop\Admin\Tests\LiveRegionHttpTestCase;

uses(LiveRegionHttpTestCase::class);

beforeEach(function (): void {
    LiveRegionPage::$calls = [];
});

it('Live region: the closure re-renders with the client-sent deps', function (): void {
    $response = $this->postJson('/admin/live-region-page/live-region/preview', [
        'deps' => ['contact' => '7'],
    ]);

    $response->assertOk()->assertExactJson(['nodes' => [
        [
            'kind' => 'displayText',
            'options' => ['content' => 'Contact: 7', 'variant' => 'muted'],
            'meta' => [],
        ],
    ]]);
});

it('Live region: an empty deps bag is a legitimate request, not an error', function (): void {
    $response = $this->postJson('/admin/live-region-page/live-region/preview', [
        'deps' => [],
    ]);

    $response->assertOk()->assertExactJson(['nodes' => [
        [
            'kind' => 'displayText',
            'options' => ['content' => 'Contact: none', 'variant' => 'muted'],
            'meta' => [],
        ],
    ]]);
});

it('Live region: an undeclared dep key is dropped before the closure sees it', function (): void {
    $this->postJson('/admin/live-region-page/live-region/preview', [
        'deps' => ['contact' => '5', 'injected' => 'x'],
    ])->assertOk();

    expect(LiveRegionPage::$calls)->toBe([['contact' => '5']]);
});

it('Live region: a non-scalar dep value is dropped before the closure sees it', function (): void {
    $this->postJson('/admin/live-region-page/live-region/preview', [
        'deps' => ['contact' => ['nested' => 'array']],
    ])->assertOk();

    expect(LiveRegionPage::$calls)->toBe([[]]);
});

it('Live region: a when(false) region answers 404', function (): void {
    $this->postJson('/admin/live-region-page/live-region/secret', ['deps' => []])
        ->assertNotFound();
});

it('Live region: a region inside a when(false) form answers 404', function (): void {
    $this->postJson('/admin/live-region-page/live-region/ghost', ['deps' => []])
        ->assertNotFound();
});

it('Live region: an unknown region name answers 404', function (): void {
    $this->postJson('/admin/live-region-page/live-region/nonexistent', ['deps' => []])
        ->assertNotFound();
});
