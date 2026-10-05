<?php

use Tbtop\Admin\Tests\ActionSkipValidationHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\SectionHeaderActionPage;

uses(ActionSkipValidationHttpTestCase::class);

beforeEach(function (): void {
    SectionHeaderActionPage::$capturedForm = null;
});

it('holds a section header action to its enclosing form rules', function (): void {
    $this->postJson('/admin/section-header-action/actions/saveFromHeader', [
        'payload' => ['form' => ['title' => '']],
    ])->assertStatus(422)->assertJsonValidationErrors(['title']);

    expect(SectionHeaderActionPage::$capturedForm)->toBeNull();
});

it('hands a section header action the validated form payload', function (): void {
    $this->postJson('/admin/section-header-action/actions/saveFromHeader', [
        'payload' => ['form' => ['title' => 'Hello', 'smuggled' => 'nope']],
    ])->assertOk();

    expect(SectionHeaderActionPage::$capturedForm)->toBe(['title' => 'Hello']);
});
