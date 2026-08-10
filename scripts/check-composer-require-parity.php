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

if ($mismatches === []) {
    echo "OK: composer.json and packages/php/composer.json require the same runtime dependencies.\n";
    exit(0);
}

fwrite(STDERR, "Root and nested composer.json \"require\" blocks diverge:\n");
foreach ($mismatches as $mismatch) {
    fwrite(STDERR, "  - {$mismatch}\n");
}

exit(1);
