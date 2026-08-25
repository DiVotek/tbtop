<?php

use Tbtop\Admin\Support\ApiReference\MethodClassifier;
use Tbtop\Admin\Support\ApiReference\ReferenceRenderer;
use Tbtop\Admin\Support\ApiReference\SurfaceMap;

const API_REFERENCE_DIR = __DIR__.'/../../../docs/ai/api';

/**
 * The generated reference is a snapshot, same discipline as the kitchen-sink contract:
 * a plain run fails on drift, UPDATE_FIXTURES=1 regenerates. Adding a public method
 * without regenerating is what this catches.
 */
it('ApiReference: generated pages match the committed snapshot', function () {
    $renderer = new ReferenceRenderer;

    foreach (SurfaceMap::all() as $slug => $surface) {
        $path = API_REFERENCE_DIR.'/'.$slug.'.md';
        $current = $renderer->render($slug, $surface);

        if (! file_exists($path) || getenv('UPDATE_FIXTURES')) {
            @mkdir(dirname($path), 0755, true);
            file_put_contents($path, $current);
        }

        expect($current)->toBe(
            (string) file_get_contents($path),
            "docs/ai/api/{$slug}.md is stale — regenerate with UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference",
        );
    }
});

it('ApiReference: every public method is classified as authoring or internal', function () {
    $classifier = new MethodClassifier;
    $unclassified = [];

    foreach (SurfaceMap::all() as $surface) {
        foreach ($surface['classes'] as $class) {
            foreach ($classifier->classify($class)['unclassified'] as $method) {
                $unclassified[] = $class.'::'.$method->getName();
            }
        }
    }

    expect($unclassified)->toBe([], implode("\n", [
        'Unclassified public methods — the docs generator does not know whether these are authoring surface:',
        ...$unclassified,
        'Fix: make it fluent (return self/static), rename it to match an internal pattern,',
        'or add it to MethodClassifier::AUTHORING_EXCEPTIONS.',
    ]));
});
