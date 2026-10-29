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

it('parameterized stat is served from the data endpoint with query-string params', function (): void {
    $this->getJson('/admin/chart-params/data/Signups?period=30d&from=2026-10-01')
        ->assertOk()
        ->assertExactJson(['data' => ['value' => '30d from 2026-10-01']]);
});

it('parameterized stat falls back to param defaults and ignores undeclared keys', function (): void {
    $this->getJson('/admin/chart-params/data/Signups?page=2')
        ->assertOk()
        ->assertExactJson(['data' => ['value' => '7d from 2026-01-01']]);
});

it('parameterized stat rejects a param value its rules refuse', function (): void {
    $this->getJson('/admin/chart-params/data/Signups?period=999999d')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('period');
});

it('params without rules() still reject an array-shaped value', function (): void {
    $this->getJson('/admin/chart-params/data/withParams?interval[]=day')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('interval');
});

it('unknown data source still responds 404', function (): void {
    $this->getJson('/admin/chart-params/data/nope')->assertNotFound();
});
