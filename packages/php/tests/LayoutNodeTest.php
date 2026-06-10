<?php

use Tbtop\Admin\Dsl\S;

function encodeNode(mixed $value): array
{
    return json_decode((string) json_encode($value), true);
}

// ---------------------------------------------------------------------------
// S::collapsible
// ---------------------------------------------------------------------------

it('serializes collapsible node with label and default collapsed=false', function () {
    $s = new S;
    $node = $s->collapsible(['label' => 'Advanced'], [$s->text('slug')]);

    $json = encodeNode($node);

    expect($json['kind'])->toBe('collapsible')
        ->and($json['options']['label'])->toBe('Advanced')
        ->and($json['options']['collapsed'])->toBeFalse()
        ->and($json['options']['children'][0]['name'])->toBe('slug');
});

it('serializes collapsible with collapsed=true when passed in opts', function () {
    $s = new S;
    $node = $s->collapsible(['label' => 'More', 'collapsed' => true], [$s->text('bio')]);

    $json = encodeNode($node);

    expect($json['options']['collapsed'])->toBeTrue();
});

it('serializes collapsible hiddenIf into meta', function () {
    $s = new S;
    $node = $s->collapsible(
        ['label' => 'SEO', 'hiddenIf' => ['op' => 'eq', 'field' => 'type', 'value' => 'video']],
        [$s->text('seo_title')]
    );

    $json = encodeNode($node);

    expect($json['meta'])->toHaveKey('hiddenIf')
        ->and($json['meta']['hiddenIf']['field'])->toBe('type');
});

// ---------------------------------------------------------------------------
// S::aside
// ---------------------------------------------------------------------------

it('serializes aside node with children', function () {
    $s = new S;
    $node = $s->aside([$s->text('sidebar_note')]);

    $json = encodeNode($node);

    expect($json['kind'])->toBe('aside')
        ->and($json['options']['children'][0]['name'])->toBe('sidebar_note');
});

// ---------------------------------------------------------------------------
// S::actionGroup
// ---------------------------------------------------------------------------

it('serializes actionGroup node with label and action children', function () {
    $s = new S;
    $actions = [
        $s->action('publish')->label('Publish')->visit('/publish'),
        $s->action('archive')->label('Archive')->handle(fn () => null, needs: ['row']),
    ];
    $node = $s->actionGroup('More actions', $actions);

    $json = encodeNode($node);

    expect($json['kind'])->toBe('actionGroup')
        ->and($json['options']['label'])->toBe('More actions')
        ->and($json['options']['children'])->toHaveCount(2)
        ->and($json['options']['children'][0]['options']['spec']['type'])->toBe('visit')
        ->and($json['options']['children'][1]['options']['spec']['type'])->toBe('server');
});
