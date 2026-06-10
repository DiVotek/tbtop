<?php

use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\S;

/** Minimal custom field for registry tests. */
final class RatingField extends Field
{
    protected function kind(): string
    {
        return 'rating';
    }

    public function max(int $max): static
    {
        return $this->set('max', $max);
    }
}

/** Something that does NOT extend Field — for the rejection test. */
final class NotAField
{
    public string $name = 'x';
}

beforeEach(function () {
    // Reset static kind map between tests by re-registering or relying on
    // a clean slate — S::$kindMap is a static property bootstrapped lazily.
    // We need to clear out any custom kinds registered in prior tests.
    // The simplest approach: nothing to do because S::register overrides
    // per-kind — each test registers independently, and the built-in map
    // is not affected.
});

it('FieldRegistry: S::register adds a custom kind resolvable via __call', function () {
    S::register('rating', RatingField::class);
    $s = new S;

    $json = json_decode(json_encode($s->rating('x')), true);

    expect($json['kind'])->toBe('rating')
        ->and($json['name'])->toBe('x');
});

it('FieldRegistry: registered custom kind serializes options correctly', function () {
    S::register('rating', RatingField::class);
    $s = new S;

    $json = json_decode(json_encode($s->rating('stars')->max(10)), true);

    expect($json['kind'])->toBe('rating')
        ->and($json['options']['max'])->toBe(10);
});

it('FieldRegistry: S::register with non-Field class throws InvalidArgumentException', function () {
    S::register('bad', NotAField::class);
})->throws(InvalidArgumentException::class);

it('FieldRegistry: unknown kind still throws InvalidArgumentException', function () {
    $s = new S;
    $s->unknownKindXyz('test');
})->throws(InvalidArgumentException::class);
