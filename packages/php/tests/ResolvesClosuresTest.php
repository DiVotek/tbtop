<?php

use Tbtop\Admin\Dsl\ListBuilder;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\Stat;
use Tbtop\Admin\Dsl\Tab;
use Tbtop\Admin\Dsl\TableBuilder;

function encodeResolved(mixed $builder): array
{
    return json_decode((string) json_encode($builder), true);
}

it('Field: a Closure label is resolved in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved($s->text('title')->label(fn (): string => 'Title'));

    expect($json['options']['label'])->toBe('Title');
});

it('Field: labelText() resolves a Closure label (validator attribute seam)', function (): void {
    $s = new S;
    $form = $s->form('post', [
        $s->text('title')->label(fn (): string => 'Title')->required(),
    ]);

    expect($form->collectAttributes())->toBe(['title' => 'Title']);
});

it('Field: default(fn) resolves via defaultValue()', function (): void {
    $s = new S;
    $field = $s->text('slug')->default(fn (): string => 'generated-slug');

    expect($field->defaultValue())->toBe('generated-slug');
});

it('Field: default(fn) resolves in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved($s->text('slug')->default(fn (): string => 'generated-slug'));

    expect($json['options']['default'])->toBe('generated-slug');
});

it('Field: a non-Closure label and default pass through untouched', function (): void {
    $s = new S;
    $field = $s->text('title')->label('Title')->default('draft');

    expect($field->labelText())->toBe('Title')
        ->and($field->defaultValue())->toBe('draft');
});

it('Field: disabled(true) serializes meta.disabled', function (): void {
    $s = new S;
    $json = encodeResolved($s->text('title')->disabled());

    expect($json['meta']['disabled'])->toBeTrue();
});

it('Field: disabled(Closure) resolves meta.disabled in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved($s->text('title')->disabled(fn (): bool => true));

    expect($json['meta']['disabled'])->toBeTrue();
});

it('Stat: Closure value still resolves through the shared trait', function (): void {
    $json = encodeResolved(Stat::make('Posts')->value(fn (): int => 99));

    expect($json['options']['value'])->toBe(99);
});

it('Stat: disabled(Closure) resolves meta.disabled', function (): void {
    $json = encodeResolved(Stat::make('Posts')->value(1)->disabled(fn (): bool => true));

    expect($json['meta']['disabled'])->toBeTrue();
});

it('ListBuilder: items Closure still resolves lazily through the shared trait', function (): void {
    $json = encodeResolved(ListBuilder::make('recent')->items(fn (): array => [['title' => 'A']]));

    expect($json['options']['items'])->toBe([['title' => 'A']]);
});

it('ListBuilder: no items Closure still emits an empty list (back-compat)', function (): void {
    $json = encodeResolved(ListBuilder::make('bare'));

    expect($json['options']['items'])->toBe([]);
});

it('Field: helperText and tooltip Closures resolve in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->text('title')
            ->helperText(fn (): string => 'Shown publicly')
            ->tooltip(fn (): string => 'Max 60 chars')
    );

    expect($json['options']['helperText'])->toBe('Shown publicly')
        ->and($json['options']['tooltip'])->toBe('Max 60 chars');
});

it('Per-kind fields: a representative sample of Closure options resolves in the serialized Node', function (): void {
    $s = new S;

    $text = encodeResolved($s->text('t')->placeholder(fn (): string => 'e.g. Acme')->mask(fn (): string => '999'));
    expect($text['options']['placeholder'])->toBe('e.g. Acme')
        ->and($text['options']['mask'])->toBe('999');

    $number = encodeResolved($s->number('n')->placeholder(fn (): string => '0')->step(fn (): int => 5));
    expect($number['options']['placeholder'])->toBe('0')
        ->and($number['options']['step'])->toBe(5);

    $slider = encodeResolved($s->slider('s')->min(fn (): int => 1)->max(fn (): int => 10)->step(fn (): int => 2));
    expect($slider['options']['min'])->toBe(1)
        ->and($slider['options']['max'])->toBe(10)
        ->and($slider['options']['step'])->toBe(2);

    $media = encodeResolved($s->media('m')->variant(fn (): string => 'preview'));
    expect($media['options']['variant'])->toBe('preview');

    $repeater = encodeResolved($s->repeater('r')->maxItems(fn (): int => 3)->minItems(fn (): int => 1)->defaultItems(fn (): int => 1));
    expect($repeater['options']['maxItems'])->toBe(3)
        ->and($repeater['options']['minItems'])->toBe(1)
        ->and($repeater['options']['defaultItems'])->toBe(1);
});

it('Upload: convertTo/quality Closures resolve inside the nested image bag', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->upload('avatar')
            ->convertTo(fn (): string => 'webp')
            ->quality(fn (): int => 80)
    );

    expect($json['options']['image'])->toBe(['convertTo' => 'webp', 'quality' => 80]);
});

it('Upload: maxFiles(Closure) still resolves to an int RuleWalker can auto-inject max from', function (): void {
    $s = new S;
    $form = $s->form('post', [
        $s->upload('gallery')->multiple()->maxFiles(fn (): int => 5),
    ]);

    expect($form->collectRules())->toBe([
        'gallery' => ['array', 'max:5'],
        'gallery.*' => ['string'],
    ]);
});

it('HasIcon: name/position Closures resolve in the serialized Node', function (): void {
    $json = encodeResolved(Stat::make('Posts')->value(1)->icon(fn (): string => 'chart', fn (): string => 'right'));

    expect($json['options']['icon'])->toBe(['name' => 'chart', 'position' => 'right']);
});

it('HasIcon: an invalid literal position still throws eagerly at call time', function (): void {
    Stat::make('Posts')->icon('chart', 'center');
})->throws(InvalidArgumentException::class, 'Invalid icon position "center"');

it('HasIcon: an invalid Closure position throws lazily when the Node is read', function (): void {
    Stat::make('Posts')->value(1)->icon('chart', fn (): string => 'center')->toNode();
})->throws(InvalidArgumentException::class, 'Invalid icon position "center"');

it('HasTooltip: a Closure tooltip resolves via the shared trait on ActionBuilder', function (): void {
    $s = new S;
    $json = encodeResolved($s->action('approve')->visit('/x')->tooltip(fn (): string => 'Approve this record'));

    expect($json['options']['tooltip'])->toBe('Approve this record');
});

it('HasCopyable: message/duration Closures resolve in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->text('code')->copyable(fn (): string => 'Copied!', fn (): int => 3000)
    );

    expect($json['options']['copyable'])->toBe(['message' => 'Copied!', 'duration' => 3000]);
});

it('Field and concerns: non-Closure values still pass through untouched', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->upload('doc')
            ->convertTo('png')
            ->quality(90)
            ->maxFiles(2)
            ->copyable('Copied')
    );

    expect($json['options']['image'])->toBe(['convertTo' => 'png', 'quality' => 90])
        ->and($json['options']['maxFiles'])->toBe(2)
        ->and($json['options']['copyable'])->toBe(['message' => 'Copied', 'duration' => 2000]);
});

// ---------------------------------------------------------------------------
// ActionBuilder: label/color/badge/confirm/size Closures
// ---------------------------------------------------------------------------

it('ActionBuilder: label/color Closures resolve in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->action('approve')
            ->visit('/x')
            ->label(fn (): string => 'Approve')
            ->color(fn (): string => 'success')
    );

    expect($json['options']['label'])->toBe('Approve')
        ->and($json['options']['color'])->toBe('success');
});

it('ActionBuilder: badge(Closure) resolves and is cast to string like the eager path', function (): void {
    $s = new S;
    $json = encodeResolved($s->action('inbox')->visit('/x')->badge(fn (): int => 7));

    expect($json['options']['badge'])->toBe('7');
});

it('ActionBuilder: confirm() title/description Closures resolve in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved(
        $s->action('delete')->visit('/x')->confirm(
            fn (): string => 'Are you sure?',
            fn (): string => 'This cannot be undone.',
        )
    );

    expect($json['options']['confirm'])->toBe([
        'title' => 'Are you sure?',
        'description' => 'This cannot be undone.',
    ]);
});

it('ActionBuilder: size(Closure) resolves to a valid size in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved($s->action('go')->visit('/x')->size(fn (): string => 'lg'));

    expect($json['options']['size'])->toBe('lg');
});

it('ActionBuilder: size() with an invalid literal still throws eagerly at call time', function (): void {
    (new S)->action('go')->visit('/x')->size('huge');
})->throws(InvalidArgumentException::class, 'Invalid button size "huge"');

it('ActionBuilder: size(Closure) resolving to an invalid value throws lazily when the Node is read', function (): void {
    (new S)->action('go')->visit('/x')->size(fn (): string => 'huge')->toNode();
})->throws(InvalidArgumentException::class, 'Invalid button size "huge"');

// ---------------------------------------------------------------------------
// Stat: description/delta/color/trend/sparklineColor/poll Closures
// ---------------------------------------------------------------------------

it('Stat: description/delta Closures resolve in the serialized Node', function (): void {
    $json = encodeResolved(
        Stat::make('Revenue')
            ->value(1)
            ->description(fn (): string => 'vs last month', fn (): string => 'success')
            ->delta(fn (): string => '+8%', fn (): string => 'up')
    );

    expect($json['options']['description'])->toBe('vs last month')
        ->and($json['options']['descriptionColor'])->toBe('success')
        ->and($json['options']['delta'])->toBe(['text' => '+8%', 'direction' => 'up']);
});

it('Stat: description() with an invalid literal color still throws eagerly at call time', function (): void {
    Stat::make('MRR')->value(1)->description('All time', 'bogus');
})->throws(InvalidArgumentException::class, 'Invalid description color "bogus"');

it('Stat: description(Closure) color resolving to an invalid value throws lazily when the Node is read', function (): void {
    Stat::make('MRR')->value(1)->description('All time', fn (): string => 'bogus')->toNode();
})->throws(InvalidArgumentException::class, 'Invalid description color "bogus"');

it('Stat: color(Closure) resolves in the serialized Node', function (): void {
    $json = encodeResolved(Stat::make('Revenue')->value(1)->color(fn (): string => 'brand'));

    expect($json['options']['color'])->toBe('brand');
});

it('Stat: trend(Closure) resolves to a valid direction in the serialized Node', function (): void {
    $json = encodeResolved(Stat::make('MRR')->value(1)->trend(fn (): string => 'up'));

    expect($json['options']['trend'])->toBe('up');
});

it('Stat: trend() with an invalid literal still throws eagerly at call time', function (): void {
    Stat::make('MRR')->value(1)->trend('flat');
})->throws(InvalidArgumentException::class, 'Invalid trend direction "flat"');

it('Stat: trend(Closure) resolving to an invalid value throws lazily when the Node is read', function (): void {
    Stat::make('MRR')->value(1)->trend(fn (): string => 'flat')->toNode();
})->throws(InvalidArgumentException::class, 'Invalid trend direction "flat"');

it('Stat: sparklineColor(Closure) resolves to a valid token in the serialized Node', function (): void {
    $json = encodeResolved(Stat::make('CPU')->value(1)->sparkline([1, 2])->sparklineColor(fn (): string => 'success'));

    expect($json['options']['sparklineColor'])->toBe('success');
});

it('Stat: sparklineColor(Closure) resolving to an invalid value throws lazily when the Node is read', function (): void {
    Stat::make('CPU')->value(1)->sparklineColor(fn (): string => 'teal')->toNode();
})->throws(InvalidArgumentException::class, 'Invalid sparkline color "teal"');

it('Stat: poll(Closure) resolves seconds and stamps source, re-evaluated per queryClosure tick', function (): void {
    $calls = 0;
    $stat = Stat::make('Active users')->value(1)->poll(fn () => 5 + ($calls++ * 5));

    $first = encodeResolved($stat);
    expect($first['options']['poll'])->toBe(5)
        ->and($first['options']['source'])->toBe('Active users');
});

it('Stat: poll(Closure) resolving below the 5s minimum throws lazily when the Node is read', function (): void {
    Stat::make('Active users')->value(1)->poll(fn (): int => 4)->toNode();
})->throws(InvalidArgumentException::class, 'Stat poll interval must be at least 5 seconds.');

// ---------------------------------------------------------------------------
// Tab: label/description Closures
// ---------------------------------------------------------------------------

it('Tab: label/description Closures resolve in the table wire shape', function (): void {
    $node = (new TableBuilder('posts'))
        ->columns(['title' => 'Title'])
        ->tabs([
            Tab::make('published')
                ->label(fn (): string => 'Published')
                ->description(fn (): string => 'Live posts visible to readers'),
        ])
        ->toNode();

    expect($node->options['tabs'][0])->toBe([
        'name' => 'published',
        'label' => 'Published',
        'count' => false,
        'description' => 'Live posts visible to readers',
    ]);
});

it('Tab: label(Closure) resolving to null still falls back to the tab name', function (): void {
    $node = (new TableBuilder('posts'))
        ->columns(['title' => 'Title'])
        ->tabs([Tab::make('all')->label(fn (): ?string => null)])
        ->toNode();

    expect($node->options['tabs'][0]['label'])->toBe('all');
});

// ---------------------------------------------------------------------------
// ChartBuilder: poll Closure
// ---------------------------------------------------------------------------

it('ChartBuilder: poll(Closure) resolves seconds in the serialized Node', function (): void {
    $s = new S;
    $json = encodeResolved($s->chart('load', 'line')->query(fn () => [])->poll(fn (): int => 10));

    expect($json['options']['poll'])->toBe(10)
        ->and($json['options']['source'])->toBe('load');
});

it('ChartBuilder: poll() with a literal below the 5s minimum still throws eagerly at call time', function (): void {
    (new S)->chart('load', 'line')->poll(4);
})->throws(InvalidArgumentException::class);

it('ChartBuilder: poll(Closure) resolving below the 5s minimum throws lazily when the Node is read', function (): void {
    (new S)->chart('load', 'line')->poll(fn (): int => 4)->toNode();
})->throws(InvalidArgumentException::class, 'Chart poll interval must be at least 5 seconds.');
