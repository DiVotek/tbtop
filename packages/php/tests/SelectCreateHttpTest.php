<?php

use Tbtop\Admin\Tests\Fixtures\SelectCreatablePage;
use Tbtop\Admin\Tests\SelectCreateHttpTestCase;

uses(SelectCreateHttpTestCase::class);

beforeEach(function (): void {
    SelectCreatablePage::$created = null;
});

it('Select create: happy path returns {value, label}', function (): void {
    $response = $this->postJson(
        '/admin/select-create-page/select-create/author_id',
        ['name' => 'Alice'],
    );

    $response->assertOk()
        ->assertExactJson(['value' => '99', 'label' => 'Alice']);

    expect(SelectCreatablePage::$created)->toBe(['name' => 'Alice']);
});

it('Select create: validation failure returns 422 with error bag', function (): void {
    $response = $this->postJson(
        '/admin/select-create-page/select-create/author_id',
        [],
    );

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name']);

    expect(SelectCreatablePage::$created)->toBeNull();
});

it('Select create: unknown field name returns 404', function (): void {
    $this->postJson(
        '/admin/select-create-page/select-create/nonexistent_field',
        ['name' => 'Alice'],
    )->assertNotFound();
});
