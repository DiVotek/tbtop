<?php

namespace Tbtop\Admin\Validation;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Arr;
use Illuminate\Validation\InvokableValidationRule;
use Illuminate\Validation\Validator;
use Tbtop\Admin\Dsl\Fields\Embed;
use Tbtop\Admin\Dsl\Fields\Richtext;

/**
 * Validates the `embed` nodes of one Lexical document (one field key, one locale)
 * against the fields of their declared kind. Unknown kinds pass untouched.
 * Once boundTo() the stored documents, an Upload inside an embed accepts only
 * a path those documents already hold or one issued to this session.
 */
final class EmbedsRule implements ValidationRule
{
    /** @param  array<string, list<array<mixed>>>|null  $storedData  Per kind, the stored embeds' data; null = unbound. */
    public function __construct(private readonly Richtext $field, private readonly ?array $storedData = null) {}

    /**
     * This rule held to the documents already stored under its key: a
     * document, a list of them (repeater rows, several records) or null.
     */
    public function boundTo(mixed $storedDocuments): self
    {
        $data = [];
        foreach (self::documentsIn($storedDocuments) as $document) {
            foreach (self::embedNodes($document) as [$node]) {
                if (is_string($node['kind'] ?? null) && is_array($node['data'] ?? null)) {
                    $data[$node['kind']][] = $node['data'];
                }
            }
        }

        return new self($this->field, $data);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $found = self::embedNodes($value);
        $max = $this->field->getMaxEmbeds();
        if ($max !== null && count($found) > $max) {
            $fail(self::message('too_many', ['max' => $max]));

            return;
        }
        $ids = [];
        foreach ($found as $index => [$node, $atRoot]) {
            $error = $this->nodeError($node, $atRoot, $index + 1, $ids);
            if ($error !== null) {
                $fail($error);

                return;
            }
        }
    }

    /**
     * Keeps only the declared keys in each known-kind embed's data, for every
     * key of $rules this rule guards. Runs after validation passed.
     *
     * @param  array<string, mixed>  $rules  Expanded rules (Validator::getRules()).
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function applyDeclaredKeys(array $rules, array $validated): array
    {
        foreach ($rules as $key => $list) {
            $rule = self::fromList($list);
            if ($rule === null || ! Arr::has($validated, $key)) {
                continue;
            }
            Arr::set($validated, $key, $rule->withDeclaredKeys(Arr::get($validated, $key)));
        }

        return $validated;
    }

    private static function fromList(mixed $list): ?self
    {
        foreach (is_array($list) ? $list : [] as $rule) {
            // The validator wraps rule objects when it parses them.
            $rule = $rule instanceof InvokableValidationRule ? $rule->invokable() : $rule;
            if ($rule instanceof self) {
                return $rule;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $node
     * @param  array<array-key, true>  $ids
     */
    private function nodeError(array $node, bool $atRoot, int $n, array &$ids): ?string
    {
        if (! $atRoot || ! self::isWellFormed($node)) {
            return self::message('malformed', ['n' => $n]);
        }
        if (isset($ids[$node['id']])) {
            return self::message('duplicate_id', ['n' => $n]);
        }
        $ids[$node['id']] = true;
        $embed = $this->field->findEmbed($node['kind']);
        if ($embed === null) {
            return null;
        }
        $validator = $this->validatorFor($embed, $node['data']);
        if (! $validator->fails()) {
            return null;
        }

        return self::message('invalid', [
            'label' => $embed->labelText(),
            'n' => $n,
            'message' => (string) $validator->errors()->first(),
        ]);
    }

    /** @param  array<string, mixed>  $node */
    private static function isWellFormed(array $node): bool
    {
        return is_string($node['id'] ?? null) && $node['id'] !== ''
            && is_string($node['kind'] ?? null) && $node['kind'] !== ''
            && is_array($node['data'] ?? null)
            && ($node['version'] ?? null) === 1;
    }

    /** Runs after validate() passed, so every embed is well-formed and at the root. */
    private function withDeclaredKeys(mixed $value): mixed
    {
        $children = is_array($value) ? ($value['root']['children'] ?? null) : null;
        foreach (is_array($children) ? $children : [] as $i => $child) {
            $embed = is_array($child) && self::isEmbed($child) ? $this->field->findEmbed((string) $child['kind']) : null;
            if ($embed !== null) {
                $value['root']['children'][$i]['data'] = $this->validatorFor($embed, (array) $child['data'])->validated();
            }
        }

        return $value;
    }

    /** @param  array<mixed>  $data */
    private function validatorFor(Embed $embed, array $data): Validator
    {
        if ($this->storedData === null) {
            return $embed->getValidator($data);
        }

        return $embed->getBoundValidator($data, $this->storedData[$embed->kind] ?? []);
    }

    /**
     * Every Lexical document in $value: one (it has a `root`), or any nested
     * list of them.
     *
     * @return list<array<mixed>>
     */
    private static function documentsIn(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }
        if (array_key_exists('root', $value)) {
            return [$value];
        }

        return array_merge([], ...array_map(self::documentsIn(...), array_values($value)));
    }

    /**
     * Every embed node in document order, flagged with whether it sits at the
     * root. A legacy string or null document has none.
     *
     * @return list<array{0: array<string, mixed>, 1: bool}>
     */
    private static function embedNodes(mixed $value): array
    {
        $root = is_array($value) ? ($value['root'] ?? null) : null;
        if (! is_array($root) || ! is_array($root['children'] ?? null)) {
            return [];
        }

        return self::walk($root['children'], true);
    }

    /**
     * @param  array<mixed>  $children
     * @return list<array{0: array<string, mixed>, 1: bool}>
     */
    private static function walk(array $children, bool $atRoot): array
    {
        $out = [];
        foreach ($children as $child) {
            if (! is_array($child)) {
                continue;
            }
            if (self::isEmbed($child)) {
                $out[] = [$child, $atRoot];
            }
            if (is_array($child['children'] ?? null)) {
                $out = [...$out, ...self::walk($child['children'], false)];
            }
        }

        return $out;
    }

    /** @param  array<mixed>  $node */
    private static function isEmbed(array $node): bool
    {
        return ($node['type'] ?? null) === 'embed';
    }

    /** @param  array<string, mixed>  $replace */
    private static function message(string $key, array $replace): string
    {
        return (string) __("tbtop-admin::admin.field.richtext.embed_errors.{$key}", $replace);
    }
}
