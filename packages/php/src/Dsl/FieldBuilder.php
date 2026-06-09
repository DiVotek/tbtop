<?php

namespace Tbtop\Admin\Dsl;

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
        $list = is_string($rules) ? explode('|', $rules) : $rules;
        $this->ruleList = array_values(array_unique([...$this->ruleList, ...$list]));

        return $this;
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

        return new Node($this->kind, $options, $this->name, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
