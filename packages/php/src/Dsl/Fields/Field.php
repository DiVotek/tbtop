<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\ColumnsValidator;
use Tbtop\Admin\Dsl\Concerns\CollectsRules;
use Tbtop\Admin\Dsl\Concerns\HasCopyable;
use Tbtop\Admin\Dsl\Concerns\HasGenericRules;
use Tbtop\Admin\Dsl\Concerns\WithMeta;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\OptionList;
use Tbtop\Admin\Validation\ConstraintMap;

/**
 * Abstract base for all field builders.
 * Concrete per-kind subclasses live in this namespace.
 *
 * @phpstan-consistent-constructor
 */
abstract class Field implements JsonSerializable
{
    use CollectsRules;
    use HasCopyable;
    use HasGenericRules;
    use WithMeta;

    /** @var array<string, mixed> */
    protected array $opts = [];

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

    /** Muted hint text rendered below the input, above any validation error. */
    public function helperText(string $text): static
    {
        return $this->set('helperText', $text);
    }

    /** Tooltip text shown in an info-icon popover next to the field label. */
    public function tooltip(string $text): static
    {
        return $this->set('tooltip', $text);
    }

    public function required(): static
    {
        $this->opts['required'] = true;

        return $this->rules('required');
    }

    /** @param  string|list<string>  $rules */
    public function rules(string|array $rules): static
    {
        $this->ruleList = $this->appendRules($this->ruleList, $rules);

        return $this;
    }

    /**
     * Overwrite the collected rule list. For helpers that rewrite an
     * existing rule in place (e.g. database ignore()), not for appending.
     *
     * @param  list<string>  $rules
     */
    protected function replaceRules(array $rules): static
    {
        $this->ruleList = $rules;

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

    /** Grid column span: int (1-8) or a breakpoint object {sm?, md?, lg?, xl?}. */
    public function columnSpan(int|array $span): static
    {
        ColumnsValidator::validate($span, 'colSpan');

        return $this->set('colSpan', $span);
    }

    /** Grid column start: int (1-8) or a breakpoint object {sm?, md?, lg?, xl?}. */
    public function columnStart(int|array $start): static
    {
        ColumnsValidator::validate($start, 'colStart');

        return $this->set('colStart', $start);
    }

    public function set(string $key, mixed $value): static
    {
        $this->opts[$key] = $value;

        return $this;
    }

    /**
     * Wire contract: option values are strings (form data and URL params are).
     *
     * @param  list<array{value: mixed, label: string}>  $options
     * @return list<array{value: string, label: string}>
     */
    protected static function normalizeOptionValues(array $options): array
    {
        return OptionList::normalize($options);
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
        $options = [...$this->opts, ...$this->copyableOption()];
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
