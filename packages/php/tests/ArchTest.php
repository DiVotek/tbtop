<?php

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

arch('it will not use debugging functions')
    ->expect(['dd', 'dump', 'ray'])
    ->each->not->toBeUsed();

// ---------------------------------------------------------------------------
// One pass for collecting children
// ---------------------------------------------------------------------------
// Deciding which children reach the wire lives in ChildInclusion alone. A
// second implementation is how the pass splintered before: every collection
// point (layout children, form children, table columns/filters/actions, modal
// bodies) had to remember the rule, and several forgot.

it('keeps the authorization predicate in one source file', function () {
    $offenders = [];
    foreach (sourceFiles() as $path) {
        $source = (string) file_get_contents($path);
        if (str_contains($source, 'isAuthorized()') && basename($path) !== 'ChildInclusion.php') {
            $offenders[] = substr($path, strpos($path, '/src/') + 1);
        }
    }

    // ActionBuilder declares isAuthorized(); the HTTP controllers re-check it
    // authoritatively per request, which is the deliberate second gate.
    expect($offenders)->toBe([
        'src/Dsl/ActionBuilder.php',
        'src/Http/ActionController.php',
        'src/Http/ActionDataController.php',
    ]);
});

// The guard that makes the test above non-vacuous: the pass has to run where
// every node is built, not only in the S factories that remember to call it.
// `new Node($kind, [...])` is how a consumer authors a custom block.
it('filters children inside the Node constructor', function () {
    $constructor = (string) file_get_contents(dirname(__DIR__).'/src/Dsl/Node.php');

    expect($constructor)->toContain('ChildInclusion::filter');
});

/** @return list<string> Absolute paths of every PHP file under src/. */
function sourceFiles(): array
{
    $root = dirname(__DIR__).'/src';
    $files = [];
    /** @var iterable<SplFileInfo> $it */
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root));
    foreach ($it as $file) {
        if ($file->getExtension() === 'php') {
            $files[] = $file->getPathname();
        }
    }
    sort($files);

    return $files;
}
