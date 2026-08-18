<?php

use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\ActionSkipValidationHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\ActionSkipValidationPage;

uses(ActionSkipValidationHttpTestCase::class);

beforeEach(function (): void {
    ActionSkipValidationPage::$capturedForm = null;
});

function runAction(string $action, array $form): TestResponse
{
    return test()->postJson("/admin/action-skip-validation/actions/{$action}", [
        'payload' => ['form' => $form],
    ]);
}

it('runs a withoutValidation() handler while a required field is empty', function (): void {
    $response = runAction('addBlock', ['title' => '', 'note' => 'keep me']);

    $response->assertOk();
    expect($response->json('effects.0.kind'))->toBe('notify')
        ->and(ActionSkipValidationPage::$capturedForm)
        // '' arrives as null: ConvertEmptyStringsToNull runs before the action.
        ->toMatchArray(['title' => null, 'note' => 'keep me']);
});

it('still gates a normal form-consuming action on the same form', function (): void {
    runAction('save', ['title' => ''])->assertStatus(422)
        ->assertJsonValidationErrors(['payload.form.title']);
    expect(ActionSkipValidationPage::$capturedForm)->toBeNull();
});

it('drops undeclared keys even with the gate off', function (): void {
    runAction('addBlock', ['title' => '', 'extra' => 'smuggled'])->assertOk();

    expect(ActionSkipValidationPage::$capturedForm)->not->toHaveKey('extra')
        ->and(ActionSkipValidationPage::$capturedForm)->toHaveKey('title');
});

it('keeps repeater rows with the gate off and drops undeclared sub-keys', function (): void {
    runAction('addBlock', [
        'title' => '',
        'items' => [
            ['name' => 'first', 'junk' => 'nope'],
            ['name' => '', 'junk' => 'nope'],
        ],
    ])->assertOk();

    expect(ActionSkipValidationPage::$capturedForm['items'])->toBe([
        ['name' => 'first'],
        ['name' => null],
    ]);
});

it('serializes validate:false only when the action opted out of a form gate', function (): void {
    $s = new S;
    $optedOut = $s->action('add')->handle(fn () => null, needs: ['form'])->withoutValidation();
    $gated = $s->action('save')->handle(fn () => null, needs: ['form']);

    expect(json_decode(json_encode($optedOut), true)['options']['spec'])
        ->toBe(['type' => 'server', 'needs' => ['form'], 'validate' => false])
        ->and(json_decode(json_encode($gated), true)['options']['spec'])
        ->toBe(['type' => 'server', 'needs' => ['form']]);
});

it('ignores withoutValidation() on actions with no form gate to lift', function (): void {
    $s = new S;
    $rowOnly = $s->action('delete')->handle(fn () => null, needs: ['row'])->withoutValidation();
    $visit = $s->action('open')->visit('/x')->withoutValidation();

    expect(json_decode(json_encode($rowOnly), true)['options']['spec'])
        ->not->toHaveKey('validate')
        ->and(json_decode(json_encode($visit), true)['options']['spec'])
        ->not->toHaveKey('validate');
});

it('an opted-out action spec conforms to the wire grammar schema', function (): void {
    $s = new S;
    $node = $s->action('add')->handle(fn () => null, needs: ['form'])->withoutValidation();

    validateAgainstSchema(json_decode(json_encode($node)));
});
