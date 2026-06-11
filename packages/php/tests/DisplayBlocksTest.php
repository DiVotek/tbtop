<?php

use Tbtop\Admin\Dsl\AlertBlock;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\HtmlBlock;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\TextBlock;

function encodeDisplay(mixed $value): array
{
    return json_decode(json_encode($value), true);
}

// ---------------------------------------------------------------------------
// TextBlock
// ---------------------------------------------------------------------------

it('TextBlock serializes with default body variant', function () {
    $block = TextBlock::make('Hello world');
    $json = encodeDisplay($block);

    expect($json['kind'])->toBe('displayText')
        ->and($json['options']['content'])->toBe('Hello world')
        ->and($json['options']['variant'])->toBe('body')
        ->and($json['meta'])->toBe([]);
});

it('TextBlock serializes heading variant', function () {
    $block = TextBlock::make('Title')->variant('heading');
    $json = encodeDisplay($block);

    expect($json['options']['variant'])->toBe('heading');
});

it('TextBlock serializes subheading variant', function () {
    $json = encodeDisplay(TextBlock::make('Sub')->variant('subheading'));

    expect($json['options']['variant'])->toBe('subheading');
});

it('TextBlock serializes muted variant', function () {
    $json = encodeDisplay(TextBlock::make('Hint')->variant('muted'));

    expect($json['options']['variant'])->toBe('muted');
});

it('TextBlock is accessible via S::displayText', function () {
    $s = new S;
    $json = encodeDisplay($s->displayText('Via DSL'));

    expect($json['kind'])->toBe('displayText')
        ->and($json['options']['content'])->toBe('Via DSL');
});

// ---------------------------------------------------------------------------
// HtmlBlock
// ---------------------------------------------------------------------------

it('HtmlBlock serializes raw html', function () {
    $html = '<p>Hello <strong>world</strong></p>';
    $block = HtmlBlock::make($html);
    $json = encodeDisplay($block);

    expect($json['kind'])->toBe('displayHtml')
        ->and($json['options']['html'])->toBe($html)
        ->and($json['meta'])->toBe([]);
});

it('HtmlBlock is accessible via S::displayHtml', function () {
    $s = new S;
    $json = encodeDisplay($s->displayHtml('<em>italic</em>'));

    expect($json['kind'])->toBe('displayHtml')
        ->and($json['options']['html'])->toBe('<em>italic</em>');
});

// ---------------------------------------------------------------------------
// DisplayDivider (Node)
// ---------------------------------------------------------------------------

it('displayDivider serializes empty options and meta as objects', function () {
    $s = new S;

    expect(json_encode($s->displayDivider()))
        ->toBe('{"kind":"displayDivider","options":{},"meta":{}}');
});

// ---------------------------------------------------------------------------
// AlertBlock
// ---------------------------------------------------------------------------

it('AlertBlock serializes with default info color and no title', function () {
    $block = AlertBlock::make('Watch out!');
    $json = encodeDisplay($block);

    expect($json['kind'])->toBe('displayAlert')
        ->and($json['options']['message'])->toBe('Watch out!')
        ->and($json['options']['color'])->toBe('info')
        ->and(array_key_exists('title', $json['options']))->toBeFalse()
        ->and($json['meta'])->toBe([]);
});

it('AlertBlock serializes with title', function () {
    $json = encodeDisplay(AlertBlock::make('Body text')->title('Heads up'));

    expect($json['options']['title'])->toBe('Heads up')
        ->and($json['options']['message'])->toBe('Body text');
});

it('AlertBlock serializes Color enum', function () {
    $json = encodeDisplay(AlertBlock::make('OK')->color(Color::Success));

    expect($json['options']['color'])->toBe('success');
});

it('AlertBlock serializes string color', function () {
    $json = encodeDisplay(AlertBlock::make('Danger')->color('danger'));

    expect($json['options']['color'])->toBe('danger');
});

it('AlertBlock is accessible via S::displayAlert', function () {
    $s = new S;
    $json = encodeDisplay($s->displayAlert('Important')->title('Note')->color(Color::Warning));

    expect($json['kind'])->toBe('displayAlert')
        ->and($json['options']['color'])->toBe('warning')
        ->and($json['options']['title'])->toBe('Note');
});
