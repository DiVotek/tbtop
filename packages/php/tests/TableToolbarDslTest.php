<?php

use Tbtop\Admin\Dsl\TableBuilder;

function encodeToolbarTable(TableBuilder $table): array
{
    return json_decode(json_encode($table->toNode()), true);
}

it('TableBuilder: toolbar(false) emits searchInput:false and columnToggle:false', function (): void {
    $json = encodeToolbarTable((new TableBuilder('t'))->toolbar(false));

    expect($json['options']['searchInput'])->toBeFalse()
        ->and($json['options']['columnToggle'])->toBeFalse();
});

it('TableBuilder: toolbar(true) emits searchInput:true and columnToggle:true', function (): void {
    $json = encodeToolbarTable((new TableBuilder('t'))->toolbar());

    expect($json['options']['searchInput'])->toBeTrue()
        ->and($json['options']['columnToggle'])->toBeTrue();
});

it('TableBuilder: searchInput(false) hides only the search input', function (): void {
    $json = encodeToolbarTable((new TableBuilder('t'))->searchInput(false));

    expect($json['options']['searchInput'])->toBeFalse()
        ->and($json['options'])->not->toHaveKey('columnToggle');
});

it('TableBuilder: columnToggle(false) hides only the columns dropdown', function (): void {
    $json = encodeToolbarTable((new TableBuilder('t'))->columnToggle(false));

    expect($json['options']['columnToggle'])->toBeFalse()
        ->and($json['options'])->not->toHaveKey('searchInput');
});

it('TableBuilder: without toolbar()/searchInput()/columnToggle() both keys are absent', function (): void {
    $json = encodeToolbarTable(new TableBuilder('t'));

    expect($json['options'])->not->toHaveKey('searchInput')
        ->and($json['options'])->not->toHaveKey('columnToggle');
});
