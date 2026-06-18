<?php

use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Tests\ActionDataHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\ActionDataPage;

uses(ActionDataHttpTestCase::class);

beforeEach(function (): void {
    ActionDataPage::$capturedRow = null;
});

it('modal action data endpoint runs the query closure and returns its data', function (): void {
    $response = $this->postJson('/admin/action-data/actions/editPublication/data', [
        'payload' => ['row' => ['id' => 7]],
    ]);

    $response->assertOk();
    expect($response->json('data'))->toBe(['id' => 7, 'published' => true]);
});

it('passes the row payload into the query closure as ActionCtx->row', function (): void {
    $this->postJson('/admin/action-data/actions/editPublication/data', [
        'payload' => ['row' => ['id' => 42, 'title' => 'Hello']],
    ])->assertOk();

    expect(ActionDataPage::$capturedRow)->toBe(['id' => 42, 'title' => 'Hello']);
});

it('returns 404 for an action without a data query', function (): void {
    $this->postJson('/admin/action-data/actions/noQuery/data', [
        'payload' => ['row' => ['id' => 1]],
    ])->assertNotFound();
});

it('returns 404 for an unknown action', function (): void {
    $this->postJson('/admin/action-data/actions/ghost/data', [
        'payload' => ['row' => ['id' => 1]],
    ])->assertNotFound();
});

it('serializes query:true and queryNeeds onto the modal spec', function (): void {
    $s = new S;
    $action = $s->action('edit')
        ->modal('Edit', $s->displayText('x'))
        ->query(fn () => [], needs: ['row']);

    $json = json_decode(json_encode($action), true);

    expect($json['options']['spec']['type'])->toBe('modal')
        ->and($json['options']['spec']['query'])->toBe(true)
        ->and($json['options']['spec']['queryNeeds'])->toBe(['row']);
});

it('rejects query() on a non-modal action', function (): void {
    $s = new S;
    $action = $s->action('edit')->visit('/x')->query(fn () => []);

    expect(fn () => $action->toNode())->toThrow(LogicException::class);
});
