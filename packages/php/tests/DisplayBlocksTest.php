<?php

use Tbtop\Admin\Dsl\AlertBlock;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\DisplayImageBlock;
use Tbtop\Admin\Dsl\DisplayKeyValueBlock;
use Tbtop\Admin\Dsl\DisplayRichtextBlock;
use Tbtop\Admin\Dsl\DisplayValueBlock;
use Tbtop\Admin\Dsl\HtmlBlock;
use Tbtop\Admin\Dsl\MarkdownBlock;
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

// ---------------------------------------------------------------------------
// MarkdownBlock
// ---------------------------------------------------------------------------

it('MarkdownBlock serializes markdown to a displayHtml node', function () {
    $block = MarkdownBlock::make('# Hi **there**');
    $json = encodeDisplay($block);

    expect($json['kind'])->toBe('displayHtml')
        ->and($json['options']['html'])->toContain('<h1>')
        ->and($json['options']['html'])->toContain('<strong>')
        ->and($json['meta'])->toBe([]);
});

it('MarkdownBlock strips embedded HTML tags by default', function () {
    $block = MarkdownBlock::make('Hello <script>alert(1)</script> world');
    $json = encodeDisplay($block);

    expect($json['options']['html'])->not->toContain('<script>');
});

it('MarkdownBlock passes raw HTML through when allowHtml is called', function () {
    $block = MarkdownBlock::make('Hello <em>world</em>')->allowHtml();
    $json = encodeDisplay($block);

    expect($json['options']['html'])->toContain('<em>');
});

it('MarkdownBlock neutralizes unsafe links by default', function () {
    $block = MarkdownBlock::make('[click](javascript:alert(1))');
    $json = encodeDisplay($block);

    expect($json['options']['html'])->not->toContain('javascript:');
});

it('MarkdownBlock is accessible via S::markdown', function () {
    $s = new S;
    $json = encodeDisplay($s->markdown('# Hi **there**'));

    expect($json['kind'])->toBe('displayHtml')
        ->and($json['options']['html'])->toContain('<h1>')
        ->and($json['options']['html'])->toContain('<strong>');
});

// ---------------------------------------------------------------------------
// DisplayValueBlock
// ---------------------------------------------------------------------------

it('DisplayValueBlock serializes a plain value with no kind', function () {
    $json = encodeDisplay(DisplayValueBlock::make('hello'));

    expect($json['kind'])->toBe('displayValue')
        ->and($json['options']['value'])->toBe('hello')
        ->and(array_key_exists('kind', $json['options']))->toBeFalse()
        ->and($json['meta'])->toBe([]);
});

it('DisplayValueBlock badge emits the raw value plus colors meta', function () {
    $json = encodeDisplay(
        DisplayValueBlock::make('active')->badge(['active' => Color::Success, 'paused' => 'gray']),
    );

    expect($json['options']['value'])->toBe('active')
        ->and($json['options']['kind'])->toBe('badge')
        ->and($json['options']['badge']['colors'])->toBe(['active' => 'success', 'paused' => 'gray']);
});

it('DisplayValueBlock boolean emits the raw value plus boolean meta', function () {
    $json = encodeDisplay(
        DisplayValueBlock::make(true)->boolean(trueColor: Color::Success, falseColor: 'danger'),
    );

    expect($json['options']['value'])->toBe(true)
        ->and($json['options']['kind'])->toBe('boolean')
        ->and($json['options']['boolean']['trueColor'])->toBe('success')
        ->and($json['options']['boolean']['falseColor'])->toBe('danger');
});

it('DisplayValueBlock icon emits the raw value plus iconMap meta', function () {
    $json = encodeDisplay(
        DisplayValueBlock::make('shipped')->icon(['shipped' => ['icon' => 'truck', 'color' => 'success']]),
    );

    expect($json['options']['value'])->toBe('shipped')
        ->and($json['options']['kind'])->toBe('icon')
        ->and($json['options']['iconMap']['shipped'])->toBe(['icon' => 'truck', 'color' => 'success']);
});

it('DisplayValueBlock money bakes the formatted string into value', function () {
    $json = encodeDisplay(DisplayValueBlock::make(12345)->money('USD'));

    expect($json['options']['value'])->toBe('123.45 USD')
        ->and($json['options']['kind'])->toBe('money');
});

it('DisplayValueBlock date bakes the formatted string into value', function () {
    $json = encodeDisplay(DisplayValueBlock::make('2024-03-15 10:30:00')->date('Y-m-d'));

    expect($json['options']['value'])->toBe('2024-03-15')
        ->and($json['options']['kind'])->toBe('date');
});

it('DisplayValueBlock number bakes the formatted string into value', function () {
    $json = encodeDisplay(DisplayValueBlock::make(1234.5)->number(2));

    expect($json['options']['value'])->toBe('1,234.50')
        ->and($json['options']['kind'])->toBe('number');
});

it('DisplayValueBlock is accessible via S::displayValue', function () {
    $s = new S;
    $json = encodeDisplay($s->displayValue('draft')->badge(['draft' => Color::Gray]));

    expect($json['kind'])->toBe('displayValue')
        ->and($json['options']['kind'])->toBe('badge');
});

// ---------------------------------------------------------------------------
// DisplayImageBlock
// ---------------------------------------------------------------------------

it('DisplayImageBlock serializes src with no extras', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png'));

    expect($json['kind'])->toBe('displayImage')
        ->and($json['options']['src'])->toBe('/img/a.png')
        ->and(array_key_exists('asLink', $json['options']))->toBeFalse()
        ->and($json['meta'])->toBe([]);
});

it('DisplayImageBlock serializes alt and caption', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png')->alt('A')->caption('Figure 1'));

    expect($json['options']['alt'])->toBe('A')
        ->and($json['options']['caption'])->toBe('Figure 1');
});

it('DisplayImageBlock serializes asLink for file mode', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/files/report.pdf')->asLink());

    expect($json['options']['asLink'])->toBe(true);
});

it('DisplayImageBlock is accessible via S::displayImage', function () {
    $s = new S;
    $json = encodeDisplay($s->displayImage('/img/b.png'));

    expect($json['kind'])->toBe('displayImage')
        ->and($json['options']['src'])->toBe('/img/b.png');
});

it('DisplayImageBlock omits shape by default', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png'));

    expect(array_key_exists('shape', $json['options']))->toBeFalse();
});

it('DisplayImageBlock square() serializes options.shape=square', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png')->square());

    expect($json['options']['shape'])->toBe('square');
});

it('DisplayImageBlock circular() serializes options.shape=circular', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png')->circular());

    expect($json['options']['shape'])->toBe('circular');
});

it('DisplayImageBlock square()->circular() is last-wins (circular)', function () {
    $json = encodeDisplay(DisplayImageBlock::make('/img/a.png')->square()->circular());

    expect($json['options']['shape'])->toBe('circular');
});

// ---------------------------------------------------------------------------
// DisplayRichtextBlock
// ---------------------------------------------------------------------------

it('DisplayRichtextBlock serializes the editor state map', function () {
    $state = ['root' => ['children' => [], 'type' => 'root', 'version' => 1]];
    $json = encodeDisplay(DisplayRichtextBlock::make($state));

    expect($json['kind'])->toBe('displayRichtext')
        ->and($json['options']['state'])->toBe($state)
        ->and($json['meta'])->toBe([]);
});

it('DisplayRichtextBlock is accessible via S::displayRichtext', function () {
    $s = new S;
    $state = ['root' => ['type' => 'root', 'version' => 1]];
    $json = encodeDisplay($s->displayRichtext($state));

    expect($json['kind'])->toBe('displayRichtext')
        ->and($json['options']['state'])->toBe($state);
});

// ---------------------------------------------------------------------------
// DisplayKeyValueBlock
// ---------------------------------------------------------------------------

it('DisplayKeyValueBlock serializes the entries map', function () {
    $json = encodeDisplay(DisplayKeyValueBlock::make(['SKU' => 'A-1', 'Weight' => '2kg']));

    expect($json['kind'])->toBe('displayKeyValue')
        ->and($json['options']['entries'])->toBe(['SKU' => 'A-1', 'Weight' => '2kg'])
        ->and($json['meta'])->toBe([]);
});

it('DisplayKeyValueBlock serializes an empty map as an object', function () {
    expect(json_encode(DisplayKeyValueBlock::make([])))
        ->toContain('"entries":{}');
});

it('DisplayKeyValueBlock is accessible via S::displayKeyValue', function () {
    $s = new S;
    $json = encodeDisplay($s->displayKeyValue(['Status' => 'Open']));

    expect($json['kind'])->toBe('displayKeyValue')
        ->and($json['options']['entries'])->toBe(['Status' => 'Open']);
});
