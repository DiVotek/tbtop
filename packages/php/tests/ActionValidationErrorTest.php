<?php

use Tbtop\Admin\Tests\ActionValidationErrorHttpTest;

uses(ActionValidationErrorHttpTest::class);

it('an uncaught ValidationException from an action handler produces a native 422 with a per-field errors bag', function (): void {
    $response = $this->postJson('/admin/action-validation/actions/throwsUncaught', [
        'payload' => ['form' => ['title' => '', 'email' => 'not-an-email']],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['title', 'email']);
    expect($response->json('errors.title.0'))->toBeString()
        ->and($response->json('errors.email.0'))->toBeString();
});

it('an uncaught ValidationException is NOT a redirect — it is a plain JSON 422', function (): void {
    $response = $this->postJson('/admin/action-validation/actions/throwsUncaught', [
        'payload' => ['form' => ['title' => '', 'email' => 'not-an-email']],
    ]);

    $response->assertStatus(422);
    expect($response->headers->get('Location'))->toBeNull();
});

it('a handler that catches the ValidationException itself and returns haltModal responds 200 with the effect', function (): void {
    $response = $this->postJson('/admin/action-validation/actions/haltsInstead', [
        'payload' => ['form' => ['title' => '']],
    ]);

    $response->assertOk();
    $effects = $response->json('effects');
    expect($effects)->toHaveCount(1)
        ->and($effects[0]['kind'])->toBe('haltModal')
        ->and($effects[0]['message'])->toBeString()
        ->and($effects[0]['message'])->not->toBe('');
});

it('a normal Effects response for a valid submission is unaffected (backward compatibility)', function (): void {
    $response = $this->postJson('/admin/action-validation/actions/succeeds', [
        'payload' => ['form' => ['title' => 'Anything']],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toEqual([
        ['kind' => 'notify', 'message' => 'Saved', 'level' => 'success'],
        ['kind' => 'closeModal'],
    ]);
});
