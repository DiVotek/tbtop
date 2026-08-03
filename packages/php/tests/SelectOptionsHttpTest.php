<?php

use Tbtop\Admin\Tests\Fixtures\SelectQueryPage;
use Tbtop\Admin\Tests\SelectOptionsHttpTestCase;

uses(SelectOptionsHttpTestCase::class);

beforeEach(function (): void {
    SelectQueryPage::$calls = [];
});

// ---------------------------------------------------------------------------
// Search mode
// ---------------------------------------------------------------------------

it('Select options: an associative map is emitted as value/label rows', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/country', ['search' => '']);

    $response->assertOk()->assertExactJson(['options' => [
        ['value' => 'fr', 'label' => 'France'],
        ['value' => 'de', 'label' => 'Germany'],
        ['value' => 'gr', 'label' => 'Greece'],
    ]]);
});

it('Select options: a list of rows passes through as-is', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/color', ['search' => '']);

    $response->assertOk()->assertExactJson(['options' => [
        ['value' => 'red', 'label' => 'Red'],
    ]]);
});

it('Select options: the search term reaches the closure', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/country', ['search' => 'gree']);

    $response->assertOk()->assertExactJson(['options' => [
        ['value' => 'gr', 'label' => 'Greece'],
    ]]);
    expect(SelectQueryPage::$calls)->toBe([['deps' => [], 'search' => 'gree']]);
});

it('Select options: declared dependsOn values reach the closure', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/city', [
        'search' => '',
        'deps' => ['country' => 'de'],
    ]);

    $response->assertOk()->assertExactJson(['options' => [
        ['value' => 'ber', 'label' => 'Berlin'],
    ]]);
});

it('Select options: an undeclared dep key is dropped before the closure sees it', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/country', [
        'search' => '',
        'deps' => ['country' => 'fr', 'injected' => 'x'],
    ]);

    $response->assertOk();
    expect(SelectQueryPage::$calls)->toBe([['deps' => [], 'search' => '']]);
});

// ---------------------------------------------------------------------------
// Resolve mode
// ---------------------------------------------------------------------------

it('Select options: resolve reads the label off the associative map', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/country', ['value' => 'de']);

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => 'de', 'label' => 'Germany']]);
});

it('Select options: resolve falls back to resolveUsing for a list source', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/city', [
        'value' => 'par',
        'deps' => ['country' => 'fr'],
    ]);

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => 'par', 'label' => 'Paris']]);
});

it('Select options: an unresolvable value is echoed back as its own label', function (): void {
    $response = $this->postJson('/admin/select-query-page/select-options/color', ['value' => 'blue']);

    $response->assertOk()
        ->assertExactJson(['option' => ['value' => 'blue', 'label' => 'blue']]);
});

// ---------------------------------------------------------------------------
// Field lookup
// ---------------------------------------------------------------------------

it('Select options: unknown field name returns 404', function (): void {
    $this->postJson('/admin/select-query-page/select-options/nonexistent', ['search' => ''])
        ->assertNotFound();
});

it('Select options: a select without query() returns 404', function (): void {
    $this->postJson('/admin/select-query-page/select-options/status', ['search' => ''])
        ->assertNotFound();
});
