<?php

const ROUTES_PATH = __DIR__.'/../routes/admin.php';
const WIRING_DOC_PATH = __DIR__.'/../../../docs/ai/wiring.md';

/**
 * The endpoint inventory in wiring.md is hand-written — its Transport and
 * Response-shape columns carry knowledge reflection cannot produce. This guards
 * only completeness: a new route must appear there, which is exactly the gap
 * that let the notifications and select-options endpoints go undocumented.
 */
it('WiringDocs: every routed controller appears in the endpoint inventory', function () {
    $routes = (string) file_get_contents(ROUTES_PATH);
    $doc = (string) file_get_contents(WIRING_DOC_PATH);

    preg_match_all('/(\w+Controller)::class/', $routes, $matches);
    $controllers = array_values(array_unique($matches[1]));

    expect($controllers)->not->toBeEmpty();

    $missing = array_values(array_filter(
        $controllers,
        fn (string $controller) => ! str_contains($doc, $controller),
    ));

    expect($missing)->toBe([], implode("\n", [
        'Routed controllers missing from the endpoint inventory in docs/ai/wiring.md:',
        ...$missing,
        'Add a row for each: method, path, route name, controller, transport, response shape.',
    ]));
});
