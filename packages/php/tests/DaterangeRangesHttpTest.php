<?php

use Tbtop\Admin\Tests\DaterangeRangesHttpTestCase;

uses(DaterangeRangesHttpTestCase::class);

it('Daterange ranges: the closure re-runs with the POSTed deps', function (): void {
    $winter = $this->postJson('/admin/daterange-ranges-page/daterange-ranges/stay', [
        'deps' => ['season' => 'winter'],
    ]);
    $winter->assertOk()->assertExactJson(['ranges' => [
        ['from' => null, 'to' => '2026-03-01'],
    ]]);

    $summer = $this->postJson('/admin/daterange-ranges-page/daterange-ranges/stay', [
        'deps' => ['season' => 'summer'],
    ]);
    $summer->assertOk()->assertExactJson(['ranges' => [
        ['from' => '2026-07-01', 'to' => '2026-07-15'],
    ]]);
});

it('Daterange ranges: boolean deps have stable non-empty spellings', function (): void {
    $this->postJson('/admin/daterange-ranges-page/daterange-ranges/boolean-stay', [
        'deps' => ['enabled' => true],
    ])->assertOk()->assertExactJson(['ranges' => [[
        'from' => '2026-08-01',
        'to' => null,
    ]]]);

    $this->postJson('/admin/daterange-ranges-page/daterange-ranges/boolean-stay', [
        'deps' => ['enabled' => false],
    ])->assertOk()->assertExactJson(['ranges' => [[
        'from' => '2026-09-01',
        'to' => null,
    ]]]);
});

it('Daterange ranges: a when(false) field returns 404', function (): void {
    $this->postJson('/admin/daterange-ranges-page/daterange-ranges/gone', ['deps' => []])
        ->assertNotFound();
});
