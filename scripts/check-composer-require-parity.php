<?php

// The root composer.json is the published Packagist artifact; packages/php/composer.json
// is the working manifest for local dev and tests. Both must declare the same runtime
// dependencies, or a consumer installing from Packagist silently misses one (see the
// enshrined/svg-sanitize incident this script was written to prevent). require-dev is
// intentionally excluded: the nested manifest carries dev-only tooling the published
// package must not ship.

$rootManifest = __DIR__.'/../composer.json';
$nestedManifest = __DIR__.'/../packages/php/composer.json';

$root = json_decode(file_get_contents($rootManifest), true, flags: JSON_THROW_ON_ERROR);
$nested = json_decode(file_get_contents($nestedManifest), true, flags: JSON_THROW_ON_ERROR);

$rootRequire = $root['require'] ?? [];
$nestedRequire = $nested['require'] ?? [];

$mismatches = [];

foreach (array_unique([...array_keys($rootRequire), ...array_keys($nestedRequire)]) as $package) {
    $inRoot = array_key_exists($package, $rootRequire);
    $inNested = array_key_exists($package, $nestedRequire);

    if (! $inRoot) {
        $mismatches[] = "{$package}: missing from root composer.json (nested requires \"{$nestedRequire[$package]}\")";

        continue;
    }

    if (! $inNested) {
        $mismatches[] = "{$package}: missing from packages/php/composer.json (root requires \"{$rootRequire[$package]}\")";

        continue;
    }

    if ($rootRequire[$package] !== $nestedRequire[$package]) {
        $mismatches[] = "{$package}: root requires \"{$rootRequire[$package]}\", nested requires \"{$nestedRequire[$package]}\"";
    }
}

// The autoload block too: a `files` entry only the nested manifest carries (the
// tbtop() testing function) is undefined in every Packagist install.
$rootAutoload = json_encode($root['autoload'] ?? []);
$nestedAutoload = json_encode(array_map(
    fn (array $section): array => array_map(
        fn (string|array $path): string|array => is_string($path) ? 'packages/php/'.$path : array_map(fn (string $p): string => 'packages/php/'.$p, $path),
        $section,
    ),
    $nested['autoload'] ?? [],
));

if ($rootAutoload !== $nestedAutoload) {
    $mismatches[] = "autoload: root has {$rootAutoload}, nested (prefixed with packages/php/) has {$nestedAutoload}";
}

if ($mismatches === []) {
    echo "OK: composer.json and packages/php/composer.json declare the same runtime dependencies and autoload.\n";
    exit(0);
}

fwrite(STDERR, "Root and nested composer.json \"require\"/\"autoload\" blocks diverge:\n");
foreach ($mismatches as $mismatch) {
    fwrite(STDERR, "  - {$mismatch}\n");
}

exit(1);
