<?php

namespace Tbtop\Admin\Validation;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\Request;

/**
 * Binds a submitted Upload value to a path the submitter may claim: one the
 * record already stores for the field, or one the field upload endpoint issued
 * to this session. Any other string is a path to someone else's file, and the
 * render step would mint a signed view url for it.
 */
final class IssuedUploadPath implements ValidationRule
{
    private const SESSION_KEY = 'tbtop-admin.issued-uploads';

    /** Per field; an upload session never needs more, and the session must stay small. */
    private const MAX_PER_FIELD = 20;

    /** @param  list<string>  $storedPaths */
    public function __construct(private readonly string $field, private readonly array $storedPaths) {}

    public static function remember(Request $request, string $field, string $path): void
    {
        if (! $request->hasSession()) {
            return;
        }
        $issued = self::issued($request, $field);
        $issued[] = $path;
        $request->session()->put(self::SESSION_KEY.'.'.$field, array_slice($issued, -self::MAX_PER_FIELD));
    }

    /**
     * Every path in $value: a bare string, a {path, url} envelope, or a list
     * of either (multiple uploads, wildcard reads across repeater rows).
     *
     * @return list<string>
     */
    public static function pathsIn(mixed $value): array
    {
        if (is_string($value)) {
            return [$value];
        }
        if (! is_array($value)) {
            return [];
        }
        if (isset($value['path']) && is_string($value['path'])) {
            return [$value['path']];
        }

        return array_merge(...array_map(self::pathsIn(...), array_values($value)));
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '' || in_array($value, $this->storedPaths, true)) {
            return;
        }
        if (! in_array($value, self::issued(request(), $this->field), true)) {
            $fail('validation.in')->translate();
        }
    }

    /** @return list<string> */
    private static function issued(Request $request, string $field): array
    {
        if (! $request->hasSession()) {
            return [];
        }
        $issued = $request->session()->get(self::SESSION_KEY.'.'.$field, []);

        return is_array($issued) ? array_values(array_filter($issued, is_string(...))) : [];
    }
}
