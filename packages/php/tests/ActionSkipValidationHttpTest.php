<?php

use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\ActionSkipValidationHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\ActionSkipValidationPage;
use Tbtop\Admin\Tests\Fixtures\UnserializableActionPage;

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

it('drops an undeclared container sibling and undeclared members of a declared one', function (): void {
    runAction('addBlock', [
        'items' => [['name' => 'first', 'junk' => 'nope']],
        // Shares the `items` prefix but is a key in its own right — a container
        // check keyed on prefixes rather than whole keys would let it through.
        'itemsExtra' => ['smuggled' => true],
    ])->assertOk();

    expect(ActionSkipValidationPage::$capturedForm)->not->toHaveKey('itemsExtra')
        ->and(ActionSkipValidationPage::$capturedForm['items'])->toBe([['name' => 'first']]);
});

it('treats a non-array payload.form as empty', function (mixed $form): void {
    test()->postJson('/admin/action-skip-validation/actions/addBlock', [
        'payload' => ['form' => $form],
    ])->assertOk();

    expect(ActionSkipValidationPage::$capturedForm)->toBe([]);
})->with([
    'scalar' => 'not-a-form',
    'null' => null,
    'list' => [[['a', 'b']]],
]);

it('runs a handler action whose node would refuse to serialize', function (): void {
    // slideOver() on a non-modal action throws from toNode(). The request path
    // must reach the handler without serializing anything.
    UnserializableActionPage::$ran = false;

    test()->postJson('/admin/unserializable-action/actions/slideOverHandler', [
        'payload' => ['form' => ['title' => 'x']],
    ])->assertOk();

    expect(UnserializableActionPage::$ran)->toBeTrue();
});

it('holds a row action inside a form to that form rules', function (): void {
    // The enclosing form must survive the walk down into rowActions — the
    // client hands that same form to the action, so the rules have to follow.
    runAction('rowSave', ['title' => ''])->assertStatus(422);

    runAction('rowSave', ['title' => 'ok'])->assertOk();
    expect(ActionSkipValidationPage::$capturedForm)->toBe(['title' => 'ok']);
});

it('runs an action on a page whose header action would refuse to serialize', function (): void {
    // The request path resolves handlers by name; serializing header actions
    // there would let an unrenderable sibling 500 every POST on the page.
    UnserializableActionPage::$headerRan = false;

    test()->postJson('/admin/unserializable-action/actions/headerOk', [
        'payload' => ['row' => ['id' => 1]],
    ])->assertOk();

    expect(UnserializableActionPage::$headerRan)->toBeTrue();
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
