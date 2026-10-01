<?php

use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\HtmlString;
use Tbtop\Admin\Contracts\HasColor;
use Tbtop\Admin\Contracts\HasDescription;
use Tbtop\Admin\Contracts\HasLabel;
use Tbtop\Admin\Dsl\Color;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\DisplayValueBlock;
use Tbtop\Admin\Dsl\Fields\Radio;

// Filament-typed signatures on purpose: they must load against our contracts.
enum EnumBadgeOrderStatus: string implements HasColor, HasDescription, HasLabel
{
    case InProgress = 'in_progress';
    case Done = 'done';

    public function getLabel(): string|Htmlable|null
    {
        return match ($this) {
            self::InProgress => new HtmlString('<b>In progress</b>'),
            self::Done => null,
        };
    }

    public function getColor(): string|array|null
    {
        return $this === self::Done ? 'success' : null;
    }

    public function getDescription(): string|Htmlable|null
    {
        return $this === self::InProgress ? 'Being worked on' : null;
    }
}

enum EnumBadgePriority: int implements HasColor
{
    case Low = 0;
    case High = 1;

    public function getColor(): Color
    {
        return $this === self::High ? Color::Danger : Color::Gray;
    }
}

enum EnumBadgePure
{
    case Draft;
}

enum EnumBadgeBlank: string implements HasLabel
{
    case Empty = 'empty';

    public function getLabel(): string|Htmlable|null
    {
        return new HtmlString('<i></i>');
    }
}

enum EnumBadgePalette implements HasColor
{
    case Hot;

    public function getColor(): array
    {
        return [500 => '#f00'];
    }
}

function enumBadgeNode(JsonSerializable $node): array
{
    return json_decode((string) json_encode($node), true);
}

/**
 * Run $fn under a test-local error handler (Laravel drops deprecations in
 * unit tests, PHPUnit reports them) and return its result plus every error.
 *
 * @return array{0: mixed, 1: list<array{0: int, 1: string}>}
 */
function enumBadgeCapture(Closure $fn): array
{
    $caught = [];
    set_error_handler(function (int $errno, string $message) use (&$caught): bool {
        $caught[] = [$errno, $message];

        return true;
    });
    try {
        return [$fn(), $caught];
    } finally {
        restore_error_handler();
    }
}

it('badge expands an enum into value-keyed maps', function () {
    $column = enumBadgeNode(Column::make('status')->badge(EnumBadgeOrderStatus::class));
    $display = enumBadgeNode(DisplayValueBlock::make(EnumBadgeOrderStatus::Done)->badge(EnumBadgeOrderStatus::class));
    $pure = enumBadgeNode(Column::make('state')->badge(EnumBadgePure::class));
    $pureDisplay = enumBadgeNode(DisplayValueBlock::make(EnumBadgePure::Draft)->badge(EnumBadgePure::class));
    $blank = enumBadgeNode(Column::make('state')->badge(EnumBadgeBlank::class));
    $intJson = (string) json_encode(Column::make('priority')->badge(EnumBadgePriority::class));

    expect($column['badge'])->toBe([
        'colors' => ['done' => 'success'],
        'labels' => ['in_progress' => 'In progress', 'done' => 'Done'],
    ])
        ->and($display['options']['value'])->toBe('done')
        ->and($display['options']['badge'])->toBe($column['badge'])
        ->and($pure['badge'])->toBe(['colors' => [], 'labels' => ['Draft' => 'Draft']])
        ->and($pureDisplay['options']['value'])->toBe('Draft')
        ->and($blank['badge']['labels'])->toBe(['empty' => 'Empty'])
        ->and($intJson)->toContain('"badge":{"colors":{"0":"gray","1":"danger"},"labels":{"0":"Low","1":"High"}}');
});

it('badge reads old and new entries in one map', function () {
    [$node] = enumBadgeCapture(fn () => enumBadgeNode(Column::make('status')->badge([
        'paid' => Color::Success,
        'pending' => 'warning',
        'new' => ['label' => 'New', 'color' => Color::Info],
        'archived' => ['label' => 'Archived'],
        'void' => [],
        'unset' => ['label' => null, 'color' => null],
    ])));
    $json = json_encode(Column::make('flag')->badge(['1' => ['color' => 'success'], '0' => ['color' => 'gray']]));

    expect($node['badge'])->toBe([
        'colors' => ['paid' => 'success', 'pending' => 'warning', 'new' => 'info'],
        'labels' => ['new' => 'New', 'archived' => 'Archived'],
    ])->and($json)->toContain('"colors":{"1":"success","0":"gray"}');
});

it('old color map raises one deprecation', function () {
    [, $caught] = enumBadgeCapture(function (): void {
        Column::make('status')->badge(['paid' => Color::Success, 'pending' => 'warning', 'new' => ['label' => 'New']]);
        DisplayValueBlock::make('x')->badge(['new' => ['color' => Color::Info]]);
    });

    expect($caught)->toHaveCount(1)
        ->and($caught[0][0])->toBe(E_USER_DEPRECATED)
        ->and($caught[0][1])->toContain('removed in 1.0')
        ->and($caught[0][1])->toContain("['paid' => ['color' => Color::Success]]");
});

it('badge rejects a malformed entry', function (array|string $map, string $message) {
    expect(fn () => Column::make('status')->badge($map))
        ->toThrow(InvalidArgumentException::class, $message);
})->with([
    'unknown key' => [['paid' => ['colour' => 'success']], '"colour" in the entry for value "paid"'],
    'non Color|string|array value' => [['paid' => 42], 'entry for value "paid"'],
    'non-string label' => [['paid' => ['label' => 5]], "'label' for value \"paid\""],
    'empty label' => [['paid' => ['label' => '']], "'label' for value \"paid\""],
    'non Color|string color' => [['paid' => ['color' => 5]], "'color' for value \"paid\""],
    'not an enum class' => [stdClass::class, '"stdClass" is not an enum class'],
    'array color from an enum' => [EnumBadgePalette::class, 'EnumBadgePalette::Hot'],
]);

it('options expand an enum with descriptions', function () {
    $radio = enumBadgeNode(Radio::make('status')->options(EnumBadgeOrderStatus::class));
    $column = enumBadgeNode(
        Column::make('status')->selectColumn()->options(EnumBadgeOrderStatus::class)->onSave(fn () => null),
    );
    $pure = enumBadgeNode(Radio::make('state')->options(EnumBadgePure::class));

    expect($radio['options']['options'])->toBe([
        ['value' => 'in_progress', 'label' => 'In progress', 'description' => 'Being worked on'],
        ['value' => 'done', 'label' => 'Done'],
    ])
        ->and($column['editable']['options'])->toBe([
            ['value' => 'in_progress', 'label' => 'In progress'],
            ['value' => 'done', 'label' => 'Done'],
        ])
        ->and($pure['options']['options'])->toBe([['value' => 'Draft', 'label' => 'Draft']]);
});
