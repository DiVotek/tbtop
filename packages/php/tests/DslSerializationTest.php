<?php

use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Validation\ConstraintMap;

function encode(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

it('serializes nodes to the client grammar shape', function () {
    $s = new S;
    $tree = $s->stack([
        $s->displayText('Hi')->variant('heading'),
        $s->text('title')->label('Title'),
    ], ['gap' => 2, 'id' => 'root']);

    $json = encode($tree);

    expect($json['kind'])->toBe('stack')
        ->and($json['options']['gap'])->toBe(2)
        ->and($json['meta'])->toBe(['id' => 'root'])
        ->and($json['options']['children'][0])->toBe([
            'kind' => 'displayText',
            'options' => ['content' => 'Hi', 'variant' => 'heading'],
            'meta' => [],
        ])
        ->and($json['options']['children'][1]['name'])->toBe('title');
});

it('serializes empty options and meta as objects, not arrays', function () {
    $s = new S;

    expect(json_encode($s->displayDivider()))
        ->toBe('{"kind":"displayDivider","options":{},"meta":{}}');
});

it('maps laravel rules to wire constraints and skips server-only rules', function () {
    $constraints = ConstraintMap::toConstraints(
        ['required', 'max:200', 'min:1', 'in:a,b', 'email', 'unique:users', 'exists:posts,id'],
    );

    expect($constraints)->toBe([
        'required' => true,
        'max' => 200,
        'min' => 1,
        'in' => ['a', 'b'],
        'email' => true,
    ]);
});

it('strips pcre delimiters from regex constraints for the js client', function () {
    $constraints = ConstraintMap::toConstraints(['regex:/^[a-z0-9-]+$/']);

    expect($constraints)->toBe(['regex' => '^[a-z0-9-]+$']);
});

it('strips delimiters and flags from non-slash regex constraints', function () {
    $constraints = ConstraintMap::toConstraints(['regex:#^[a-z]+#i']);

    expect($constraints)->toBe(['regex' => '^[a-z]+']);
});

it('emits field constraints from fluent rules', function () {
    $s = new S;
    $json = encode($s->text('title')->required()->rules('max:200'));

    expect($json['options']['required'])->toBeTrue()
        ->and($json['options']['constraints'])->toBe(['required' => true, 'max' => 200]);
});

it('rejects an action with two specs', function () {
    (new ActionBuilder('save'))->submit()->visit('/x');
})->throws(LogicException::class);

it('rejects serializing an action without a spec', function () {
    json_encode(new ActionBuilder('save'));
})->throws(LogicException::class);

it('serializes server actions without leaking the closure', function () {
    $s = new S;
    $action = $s->action('publish')
        ->label('Publish')
        ->confirm('Sure?')
        ->handle(fn () => null, needs: ['row']);

    expect(encode($action)['options'])->toBe([
        'label' => 'Publish',
        'confirm' => ['title' => 'Sure?'],
        'spec' => ['type' => 'server', 'needs' => ['row']],
    ]);
});

it('serializes modal action with size', function () {
    $s = new S;
    $action = $s->action('open')->label('Open')->modal('Title')->size('lg');

    expect(encode($action)['options']['spec'])->toBe([
        'type' => 'modal',
        'title' => 'Title',
        'size' => 'lg',
    ]);
});

it('omits size from modal spec when not set', function () {
    $s = new S;
    $action = $s->action('open')->label('Open')->modal('Title');

    $spec = encode($action)['options']['spec'];
    expect($spec)->toBe(['type' => 'modal', 'title' => 'Title'])
        ->and(array_key_exists('size', $spec))->toBeFalse();
});

it('rejects invalid modal size value', function () {
    (new ActionBuilder('open'))->modal('Title')->size('xl');
})->throws(InvalidArgumentException::class);

it('rejects size() on non-modal action', function () {
    (new ActionBuilder('go'))->visit('/x')->size('sm')->toNode();
})->throws(LogicException::class);
