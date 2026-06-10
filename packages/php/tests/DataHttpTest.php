<?php

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\DataHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\ChartParamsPage;

uses(DataHttpTestCase::class);

beforeEach(function (): void {
    ChartParamsPage::$capturedParams = null;
});

it('emits param nodes under options.params in the wire structure', function (): void {
    $s = new S;
    $chart = $s->chart('test', 'bar')
        ->params([
            $s->select('interval')->default('day'),
            $s->date('from'),
        ])
        ->query(fn () => []);

    $node = $chart->toNode();
    $json = json_decode(json_encode($node), true);

    expect($json['options']['params'])->toHaveCount(2)
        ->and($json['options']['params'][0]['kind'])->toBe('select')
        ->and($json['options']['params'][0]['name'])->toBe('interval')
        ->and($json['options']['params'][0]['options']['default'])->toBe('day')
        ->and($json['options']['params'][1]['kind'])->toBe('date')
        ->and($json['options']['params'][1]['name'])->toBe('from');
});

it('zero-param chart emits no params key', function (): void {
    $s = new S;
    $node = $s->chart('plain', 'line')->query(fn () => [])->toNode();
    $json = json_decode(json_encode($node), true);

    expect($json['options'])->not->toHaveKey('params');
});

it('handler receives query-string values for declared params', function (): void {
    $this->getJson('/admin/chart-params/data/withParams?interval=month&from=2024-01-01')
        ->assertOk();

    expect(ChartParamsPage::$capturedParams)->toBe([
        'interval' => 'month',
        'from' => '2024-01-01',
    ]);
});

it('handler applies declared default when param is absent from query string', function (): void {
    $this->getJson('/admin/chart-params/data/withParams')
        ->assertOk();

    expect(ChartParamsPage::$capturedParams)->toBe([
        'interval' => 'day',
        'from' => null,
    ]);
});

it('undeclared query params are not passed to the handler', function (): void {
    $this->getJson('/admin/chart-params/data/withParams?interval=day&page=2&sort=name')
        ->assertOk();

    expect(ChartParamsPage::$capturedParams)->toHaveKeys(['interval', 'from'])
        ->and(ChartParamsPage::$capturedParams)->not->toHaveKey('page')
        ->and(ChartParamsPage::$capturedParams)->not->toHaveKey('sort');
});

it('zero-param chart still responds without params', function (): void {
    $response = $this->getJson('/admin/chart-params/data/noParams');

    $response->assertOk();
    expect($response->json('data'))->toBe([['x' => 1, 'y' => 2]]);
});
