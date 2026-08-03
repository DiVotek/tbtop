<?php

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

arch('it will not use debugging functions')
    ->expect(['dd', 'dump', 'ray'])
    ->each->not->toBeUsed();

// ---------------------------------------------------------------------------
// One pass for collecting children
// ---------------------------------------------------------------------------
// Deciding which children reach the wire lives in S::normalizeChildren() alone.
// A second implementation is how the pass splintered before: every collection
// point (layout children, form children, table columns/filters/actions, modal
// bodies) had to remember the rule, and several forgot. These two tests fail
// the moment a new inline re-implementation appears.

it('keeps the authorization filter out of every source file but S', function () {
    $offenders = [];
    foreach (sourceFiles() as $path) {
        $source = (string) file_get_contents($path);
        if (str_contains($source, 'isAuthorized()') && basename($path) !== 'S.php') {
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

it('routes every raw child list through the one collection pass', function () {
    $offenders = [];
    foreach (sourceFiles() as $path) {
        $source = (string) file_get_contents($path);
        foreach (childKeyAssignments($source) as $statement) {
            if (! str_contains($statement, 'normalizeChildren')) {
                $offenders[] = substr($path, strpos($path, '/src/') + 1).': '.trim($statement);
            }
        }
    }

    expect($offenders)->toBe([]);
});

it('applies the collection pass to a raw list rather than a built node', function () {
    expect(method_exists(S::class, 'normalizeChildren'))->toBeTrue()
        ->and(method_exists(Node::class, 'withFilteredChildren'))->toBeFalse();
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

/**
 * Lines writing a child list into a node option bag under one of the wire's
 * "child" keys. Literal values (`=> []`, `=> true`) are option defaults, not
 * collection points. Everything else is a list heading for the wire and must
 * name normalizeChildren().
 *
 * @return list<string>
 */
function childKeyAssignments(string $source): array
{
    $keys = ['children', 'fields', 'rowActions', 'headerActions', 'bulkActions', 'filters'];
    $pattern = "/'(".implode('|', $keys).")'\s*=>\s*([^,\]]+)/";

    $out = [];
    // Statements, not lines: a collection point may wrap the pass across lines.
    foreach (explode(';', $source) as $statement) {
        if (preg_match_all($pattern, $statement, $matches, PREG_SET_ORDER) === 0) {
            continue;
        }
        foreach ($matches as [, , $value]) {
            if (preg_match('/^(\[\]|true|false)$/', trim($value)) !== 1) {
                $out[] = preg_replace('/\s+/', ' ', $statement) ?? $statement;

                break;
            }
        }
    }

    return $out;
}
