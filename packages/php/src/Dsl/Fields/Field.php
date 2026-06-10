<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Validation\ConstraintMap;

/**
 * Abstract base for all field builders.
 * Concrete per-kind subclasses live in this namespace.
 *
 * @phpstan-consistent-constructor
 */
abstract class Field implements JsonSerializable
{
    /** @var array<string, mixed> */
    protected array $opts = [];

    /** @var array<string, mixed> */
    private array $metaBag = [];

    /** @var list<string> */
    private array $ruleList = [];

    /** null = not set, true = translatable, false = explicit opt-out */
    private ?bool $translatableFlag = null;

    /** Server-only filter closure — never serialized to the wire. */
    private ?Closure $filterClosure = null;

    /** @var array<string, list<string>> locale => rule list */
    private array $localeRules = [];

    abstract protected function kind(): string;

    public function __construct(public readonly string $name) {}

    public static function make(string $name): static
    {
        return new static($name);
    }

    public function label(string $label): static
    {
        return $this->set('label', $label);
    }

    public function required(): static
    {
        $this->opts['required'] = true;

        return $this->rules('required');
    }

    /** @param  string|list<string>  $rules */
    public function rules(string|array $rules): static
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

    public function translatable(bool $value = true): static
    {
        $this->translatableFlag = $value;

        return $this;
    }

    public function rulesForLocale(string $locale, string|array $rules): static
    {
        $list = is_string($rules) ? explode('|', $rules) : $rules;
        $this->localeRules[$locale] = array_values($list);

        return $this;
    }

    public function isTranslatableField(): bool
    {
        return $this->translatableFlag === true;
    }

    public function isTranslatableOptedOut(): bool
    {
        return $this->translatableFlag === false;
    }

    /** @return array<string, list<string>> */
    public function localeRuleEntries(): array
    {
        return $this->localeRules;
    }

    public function default(mixed $value): static
    {
        return $this->set('default', $value);
    }

    public function set(string $key, mixed $value): static
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function meta(string $key, mixed $value): static
    {
        $this->metaBag[$key] = $value;

        return $this;
    }

    /**
     * Attach a server-side filter closure: fn($query, $value) => $query.
     * Takes priority over kind-default mapping. NEVER serialized to the wire.
     */
    public function filterUsing(callable $fn): static
    {
        $this->filterClosure = Closure::fromCallable($fn);

        return $this;
    }

    public function filterClosure(): ?Closure
    {
        return $this->filterClosure;
    }

    public function hiddenIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['hiddenIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    public function disabledIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['disabledIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    /** @return list<string> */
    public function ruleEntries(): array
    {
        return $this->ruleList;
    }

    public function defaultValue(): mixed
    {
        return $this->opts['default'] ?? null;
    }

    /** @return list<mixed> */
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

        return new Node($this->kind(), $options, $this->name, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
