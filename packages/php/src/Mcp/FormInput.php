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
            if (! in_array($field->toNode()->kind, FormFields::UNSUPPORTED_KINDS, true)) {
                continue;
            }
            foreach (self::sent($key, $input) as $path => $value) {
                if (self::canonical($value) !== self::canonical(Arr::get($stored, $path))) {
                    $changed[] = $path;
                }
            }
        }
        if ($changed === []) {
            return;
        }
        $names = implode(', ', $changed);

        throw new AgentError("Fields listed in excludedFields cannot be changed over MCP; omit them or send their current value: {$names}.");
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
    private static function sent(string $pattern, array $input): array
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
