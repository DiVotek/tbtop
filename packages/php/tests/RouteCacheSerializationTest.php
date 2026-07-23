<?php

// route:cache serializes every route; panel configs may hold closures
// (lazy nav labels), so routes must never capture the PanelConfig itself.

use Illuminate\Support\Facades\Route;

it('keeps every registered route serializable for route:cache', function () {
    $failing = [];

    foreach (Route::getRoutes()->getRoutes() as $route) {
        $clone = clone $route;

        try {
            $clone->prepareForSerialization();
            serialize($clone);
        } catch (Throwable $e) {
            $failing[$route->getName() ?? $route->uri()] = $e->getMessage();
        }
    }

    expect($failing)->toBe([]);
});
