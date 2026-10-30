<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationData;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\FormBuilder;
use Tbtop\Admin\Dsl\RuleWalker;

/**
 * Checks a form's input before the handler runs: the form's rules alone would let an
 * agent-made upload value through, and would store a richtext document the editor cannot open.
 */
final class FormInput
{
    /**
     * An excluded field may come back with its stored value — an agent echoes a
     * repeater row from `values` whole; only a changed value is refused.
     *
     * @param  array<string, mixed>  $input
     */
    public static function assertSendable(FormBuilder $form, array $input): void
    {
        $stored = $form->recordData();
        $changed = [];
        foreach (RuleWalker::fieldsByKey($form->getFields()) as $key => $field) {
            if ($field instanceof Richtext) {
                self::assertDocuments($field, $key, $input);
            }
            if (! in_array($field->toNode()->kind, FormFields::FILE_KINDS, true)) {
                continue;
            }
            $remote = RemoteFiles::accepts($field);
            foreach (self::sent($key, $input) as $path => $value) {
                if (! self::unchanged($value, Arr::get($stored, $path), $remote)) {
                    $changed[] = $path;
                }
            }
        }
        if ($changed === []) {
            return;
        }
        $names = implode(', ', $changed);

        throw new AgentError("Send a file field as {url} or its current value; fields listed in excludedFields only as their current value: {$names}.");
    }

    /**
     * Whether a file field's $value keeps what is $stored: the same value, or — when
     * $remote — new `{url}` references beside every stored entry (a file added to a
     * multiple upload, one locale's file replaced). Dropping a stored entry is a change.
     */
    private static function unchanged(mixed $value, mixed $stored, bool $remote): bool
    {
        if (self::canonical($value) === self::canonical($stored) || ($remote && RemoteFiles::isRemote($value))) {
            return true;
        }
        if (! $remote || ! is_array($value) || ! (is_array($stored) || $stored === null)) {
            return false;
        }
        $stored ??= [];
        foreach ($stored as $key => $entry) {
            if (! array_key_exists($key, $value)) {
                return false;
            }
        }
        foreach ($value as $key => $entry) {
            if (! self::unchanged($entry, $stored[$key] ?? null, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * A translatable richtext holds one document per locale; anything but an
     * object there is checked as a single document, so it is refused.
     *
     * @param  array<string, mixed>  $input
     */
    private static function assertDocuments(Richtext $field, string $key, array $input): void
    {
        $documents = $field->isTranslatableField() ? self::sent("{$key}.*", $input) : [];
        foreach (self::sent($key, $input) as $path => $value) {
            if (! $field->isTranslatableField() || ! is_array($value)) {
                $documents[$path] = $value;
            }
        }
        foreach ($documents as $path => $document) {
            RichtextDocument::assertValid($path, $document);
        }
    }

    /**
     * The input values at rule key $pattern, by concrete path (`sections.0.image`),
     * expanded as the validator expands wildcard rules; paths not sent are skipped.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function sent(string $pattern, array $input): array
    {
        $regex = '/^'.str_replace('\*', '[^\.]+', preg_quote($pattern, '/')).'\z/';
        $out = [];
        foreach (ValidationData::initializeAndGatherData($pattern, $input) as $path => $value) {
            if (preg_match($regex, (string) $path) === 1 && Arr::has($input, (string) $path)) {
                $out[(string) $path] = $value;
            }
        }

        return $out;
    }

    /**
     * Numbers as strings, so a media id sent as "12" matches a stored 12 — and
     * nothing else matches, as a loose comparison would let `true` equal any path.
     */
    private static function canonical(mixed $value): mixed
    {
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return is_array($value) ? array_map(self::canonical(...), $value) : $value;
    }
}
