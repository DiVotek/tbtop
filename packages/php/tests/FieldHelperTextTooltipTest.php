<?php

use Tbtop\Admin\Dsl\Fields\Text;
use Tbtop\Admin\Dsl\Fields\Textarea;

function encodeHelpField(mixed $value): array  // renamed to avoid collision with CondFieldBuilderTest
{
    return json_decode(json_encode($value), true);
}

it('serializes helperText into field options', function () {
    $field = Text::make('bio')->helperText('A short description of yourself.');
    $json = encodeHelpField($field);

    expect($json['options']['helperText'])->toBe('A short description of yourself.');
});

it('serializes tooltip into field options', function () {
    $field = Text::make('slug')->tooltip('Used in the URL — lowercase letters and hyphens only.');
    $json = encodeHelpField($field);

    expect($json['options']['tooltip'])->toBe('Used in the URL — lowercase letters and hyphens only.');
});

it('serializes both helperText and tooltip when both are set', function () {
    $field = Textarea::make('body')
        ->helperText('Supports Markdown.')
        ->tooltip('Write the post body here.');
    $json = encodeHelpField($field);

    expect($json['options']['helperText'])->toBe('Supports Markdown.')
        ->and($json['options']['tooltip'])->toBe('Write the post body here.');
});

it('omits helperText and tooltip keys when neither is set', function () {
    $field = Text::make('title')->label('Title')->required();
    $json = encodeHelpField($field);

    expect($json['options'])->not->toHaveKey('helperText')
        ->and($json['options'])->not->toHaveKey('tooltip');
});
