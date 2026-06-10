<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Validation\ConstraintMap;

/**
 * Fluent field surface — DSL boundary, method count is the API.
 */
final class FieldBuilder implements JsonSerializable
{
    /** @var array<string, mixed> */
    private array $opts = [];

    /** @var array<string, mixed> */
    private array $metaBag = [];

    /** @var list<string> */
    private array $ruleList = [];

    /** null = not set, true = translatable, false = explicit opt-out */
    private ?bool $translatableFlag = null;

    /** @var array<string, list<string>> locale => rule list */
    private array $localeRules = [];

    public function __construct(
        public readonly string $kind,
        public readonly string $name,
    ) {}

    public function label(string $label): self
    {
        return $this->set('label', $label);
    }

    public function required(): self
    {
        $this->opts['required'] = true;

        return $this->rules('required');
    }

    /** @param  string|list<string>  $rules Laravel rule string ('max:200|email') or list. */
    public function rules(string|array $rules): self
    {
        if (is_string($rules) && str_contains($rules, 'regex:')) {
            throw new InvalidArgumentException(
                "Field \"{$this->name}\": pass regex rules as an array - '|' inside the pattern would be split.",
            );
        }
        $list = is_string($rules) ? explode('|', $rules) : $rules;
        $this->ruleList = array_values(array_unique([...$this->ruleList, ...$list]));

        return $this;
    }

    /** Mark this field as translatable (value becomes {locale: inner}). Pass false to opt-out. */
    public function translatable(bool $value = true): self
    {
        $this->translatableFlag = $value;

        return $this;
    }

    /** Override validation rules for a specific content locale (e.g. 'uk'). */
    public function rulesForLocale(string $locale, string|array $rules): self
    {
        $list = is_string($rules) ? explode('|', $rules) : $rules;
        $this->localeRules[$locale] = array_values($list);

        return $this;
    }

    public function isTranslatableField(): bool
    {
        return $this->translatableFlag === true;
    }

    /** True if ->translatable(false) was explicitly called — blocks cascade. */
    public function isTranslatableOptedOut(): bool
    {
        return $this->translatableFlag === false;
    }

    /** @return array<string, list<string>> */
    public function localeRuleEntries(): array
    {
        return $this->localeRules;
    }

    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function meta(string $key, mixed $value): self
    {
        $this->metaBag[$key] = $value;

        return $this;
    }

    /** @return list<string> */
    public function ruleEntries(): array
    {
        return $this->ruleList;
    }

    /** Sub-builders for repeater fields, [] for scalar kinds. @return list<mixed> */
    public function childFields(): array
    {
        $fields = $this->opts['fields'] ?? [];

        return is_array($fields) ? array_values($fields) : [];
    }

    public function toNode(): Node
    {
        $options = $this->opts;
        $constraints = ConstraintMap::toConstraints($this->ruleList);
        if ($constraints !== []) {
            $options['constraints'] = $constraints;
        }
        if ($this->translatableFlag === true) {
            $options['translatable'] = true;
        }

        return new Node($this->kind, $options, $this->name, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
