<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;

/**
 * Reads the client-sent `deps` bag for a dependent async field.
 *
 * The payload is attacker-controlled, so it is filtered against the field's
 * declared dependsOn() list rather than passed through: a query() closure must
 * never receive a key its author did not declare.
 */
final class DependencyPayload
{
    /**
     * @param  list<string>  $allowedFields
     * @return array<string, string>
     */
    public static function read(Request $request, array $allowedFields): array
    {
        $deps = $request->input('deps', []);
        if (! is_array($deps) || $allowedFields === []) {
            return [];
        }

        $allowed = array_flip($allowedFields);
        $out = [];
        foreach ($deps as $key => $value) {
            if (! is_string($key) || ! array_key_exists($key, $allowed) || ! is_scalar($value)) {
                continue;
            }
            $out[$key] = (string) $value;
        }

        return $out;
    }
}
