<?php

use Tbtop\Admin\Tests\DataHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\ChartParamsPage;

uses(DataHttpTestCase::class);

beforeEach(function (): void {
    ChartParamsPage::$statValueCalls = 0;
});

it('polled stat data endpoint returns the refreshed descriptor payload', function (): void {
    $response = $this->getJson('/admin/chart-params/data/'.rawurlencode('Active users'));

    $response->assertOk();
    expect($response->json('data'))->toHaveKeys(['value', 'description', 'sparkline'])
        ->and($response->json('data.description'))->toBe('online now')
        ->and($response->json('data.sparkline'))->toBe([1, 2, 3]);
});

it('polled stat value closure is re-invoked on every data request', function (): void {
    $first = $this->getJson('/admin/chart-params/data/'.rawurlencode('Active users'))->json('data.value');
    $second = $this->getJson('/admin/chart-params/data/'.rawurlencode('Active users'))->json('data.value');

    expect($second)->toBeGreaterThan($first);
});

it('stat without poll is not exposed on the data endpoint', function (): void {
    $this->getJson('/admin/chart-params/data/'.rawurlencode('Plain stat'))
        ->assertNotFound();
});

it('unknown data source still responds 404', function (): void {
    $this->getJson('/admin/chart-params/data/nope')->assertNotFound();
});
