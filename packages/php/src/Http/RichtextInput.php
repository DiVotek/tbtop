<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;

/**
 * Richtext documents as the client posted them. The host's global
 * TrimStrings and ConvertEmptyStringsToNull rewrite every string in the
 * input, Lexical's included: "Hello " before a bold "world" loses its space,
 * `format: ""` turns null. This puts each editor state back from the raw JSON
 * body; its embeds keep their cleaned data, which is form input like any other.
 */
final class RichtextInput
{
    /**
     * @param  array<mixed>  $input  the cleaned input at $path
     * @return array<mixed>
     */
    public static function restore(Request $request, array $input, string $path = ''): array
    {
        if (! $request->isJson()) {
            return $input;
        }
        $raw = json_decode((string) $request->getContent(), true);
        $raw = $path === '' ? $raw : data_get($raw, $path);

        return is_array($raw) ? self::merge($input, $raw) : $input;
    }

    /**
     * @param  array<mixed>  $clean
     * @param  array<mixed>  $raw
     * @return array<mixed>
     */
    private static function merge(array $clean, array $raw): array
    {
        foreach ($clean as $key => $value) {
            $original = $raw[$key] ?? null;
            if (! is_array($original) || ! is_array($value)) {
                continue;
            }
            $clean[$key] = self::isEditorState($original) ? self::withCleanEmbeds($original, $value) : self::merge($value, $original);
        }

        return $clean;
    }

    /** @param  array<mixed>  $value */
    private static function isEditorState(array $value): bool
    {
        return is_array($value['root'] ?? null) && ($value['root']['type'] ?? null) === 'root';
    }

    /**
     * @param  array<mixed>  $raw
     * @param  array<mixed>  $clean
     * @return array<mixed>
     */
    private static function withCleanEmbeds(array $raw, array $clean): array
    {
        $children = $raw['root']['children'] ?? null;
        foreach (is_array($children) ? $children : [] as $i => $child) {
            $data = $clean['root']['children'][$i]['data'] ?? null;
            if (is_array($child) && ($child['type'] ?? null) === 'embed' && is_array($data)) {
                $raw['root']['children'][$i]['data'] = $data;
            }
        }

        return $raw;
    }
}
