<?php

use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Dsl\Fields\Password;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\SecretRecord;
use Tbtop\Admin\Tests\ActionSkipValidationHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\SecretPasswordPage;

uses(ActionSkipValidationHttpTestCase::class);

beforeEach(function (): void {
    SecretPasswordPage::$submitted = null;
    SecretPasswordPage::$actionForm = null;
});

function submitSecrets(array $form): TestResponse
{
    return test()->from('/admin/secret-password')->post('/admin/secret-password/forms/settings', $form);
}

/** @return array<string, mixed>|null */
function secretNode(mixed $tree, string $name): ?array
{
    if (! is_array($tree)) {
        return null;
    }
    if (($tree['kind'] ?? null) === 'password' && ($tree['name'] ?? null) === $name) {
        return $tree;
    }
    foreach ($tree as $value) {
        $found = secretNode($value, $name);
        if ($found !== null) {
            return $found;
        }
    }

    return null;
}

it('never ships the stored value; the node says it is set, with the preview', function (): void {
    $response = $this->get('/admin/secret-password', ['X-Inertia' => 'true'])->assertOk();
    $props = $response->json('props');

    expect($props['data'])->toBe(['settings' => ['name' => 'Acme']])
        ->and($response->getContent())->not->toContain('abcd4242')
        ->and($response->getContent())->not->toContain('whsec_1')
        ->and(secretNode($props['structure'], 'api_key')['options']['secret'])->toBe(['filled' => true, 'preview' => '…4242'])
        ->and(secretNode($props['structure'], 'webhook')['options']['secret'])->toBe(['filled' => true, 'clearable' => true])
        ->and(secretNode($props['structure'], 'pin')['options']['secret'])->toBe(['filled' => true])
        ->and(secretNode($props['structure'], 'fresh')['options']['secret'])->toBe(['filled' => false])
        ->and(secretNode($props['structure'], 'token')['options']['secret'])->toBe(['filled' => true]);
});

it('leaves a secret the user left alone out of the submit; a stored required one passes', function (): void {
    submitSecrets(['name' => 'Acme 2', 'fresh' => 'new'])->assertSessionHasNoErrors();

    expect(SecretPasswordPage::$submitted)->toBe(['name' => 'Acme 2', 'fresh' => 'new']);
});

it('drops a null unless the field is clearable, where it clears', function (): void {
    submitSecrets(['pin' => null, 'webhook' => null, 'fresh' => 'x'])->assertSessionHasNoErrors();

    expect(SecretPasswordPage::$submitted)->toBe(['webhook' => null, 'fresh' => 'x']);
});

it('counts an empty string as null without ConvertEmptyStringsToNull', function (): void {
    $children = [
        (new Password('pin'))->secret(),
        (new Password('webhook'))->clearable(),
    ];

    expect(SecretRecord::applyInput(['pin' => '', 'webhook' => '', 'name' => ''], $children))
        ->toBe(['webhook' => null, 'name' => '']);
});

it('validates a replacement and passes it on', function (): void {
    submitSecrets(['pin' => '12', 'fresh' => 'x'])->assertSessionHasErrors('pin');
    expect(SecretPasswordPage::$submitted)->toBeNull();

    submitSecrets(['api_key' => 'sk_live_new', 'fresh' => 'x'])->assertSessionHasNoErrors();
    expect(SecretPasswordPage::$submitted)->toBe(['api_key' => 'sk_live_new', 'fresh' => 'x']);
});

it('keeps required for a secret with nothing stored, and a required one cannot be cleared', function (): void {
    submitSecrets([])->assertSessionHasErrors('fresh');
    expect(SecretPasswordPage::$submitted)->toBeNull();

    submitSecrets(['api_key' => null, 'fresh' => 'x'])->assertSessionHasNoErrors();
    expect(SecretPasswordPage::$submitted)->toBe(['fresh' => 'x']);
});

it('gives an action reading the page form the same input', function (): void {
    $this->postJson('/admin/secret-password/actions/rotate', [
        'payload' => ['form' => ['pin' => null, 'webhook' => null, 'fresh' => 'x']],
    ])->assertOk();

    expect(SecretPasswordPage::$actionForm)->toBe(['webhook' => null, 'fresh' => 'x']);
});

it('serializes no secret state for a plain password', function (): void {
    expect(Password::make('p')->toNode()->jsonSerialize()['options'])->not->toHaveKey('secret')
        ->and(Password::make('p')->clearable()->isSecret())->toBeTrue()
        ->and(Password::make('p')->secret()->toNode()->jsonSerialize()['options']['secret'])->toBe(['filled' => false]);
});

it('refuses a preview() that does not return a string', function (): void {
    $field = Password::make('p')->preview(fn (string $v): mixed => 42);
    $field->seedStored('secret');
    $field->toNode();
})->throws(InvalidArgumentException::class, 'preview() must return a string');

it('never clears a required secret, even one marked clearable()', function (): void {
    submitSecrets(['token' => null, 'fresh' => 'x'])->assertSessionHasNoErrors();

    expect(SecretPasswordPage::$submitted)->toBe(['fresh' => 'x'])
        ->and(Password::make('t')->clearable()->required()->isClearable())->toBeFalse();
});

it('previews a numeric stored value as its string form', function (): void {
    $field = Password::make('pin')->preview(fn (string $v): string => '…'.substr($v, -2));
    $field->seedStored(4242);

    expect($field->toNode()->jsonSerialize()['options']['secret'])->toBe(['filled' => true, 'preview' => '…42']);
});

it('refuses secret() in a modal form loaded by query(), where its value would ship', function (): void {
    $s = new S;
    $action = $s->action('edit')
        ->modal('Edit', $s->form('edit', [$s->password('key')->secret()]))
        ->query(fn (): array => ['key' => 'k']);

    expect(fn () => $action->toNode())->toThrow(LogicException::class, 'loaded by query()');
});

it('refuses secret() inside a repeater, where its value would ship in the props', function (): void {
    $s = new S;
    $s->form('f', [$s->repeater('rows')->set('fields', [$s->password('key')->secret()])])->record(['rows' => [['key' => 'k']]])->toNode();
})->throws(LogicException::class, 'top-level form field only');
