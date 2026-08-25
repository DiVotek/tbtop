<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\ColumnsValidator;
use Tbtop\Admin\Dsl\Concerns\CollectsRules;
use Tbtop\Admin\Dsl\Concerns\HasCopyable;
use Tbtop\Admin\Dsl\Concerns\HasGenericRules;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
use Tbtop\Admin\Dsl\Concerns\WithMeta;
use Tbtop\Admin\Dsl\Cond;
use Tbtop\Admin\Dsl\CondToRequiredRule;
use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\OptionList;
use Tbtop\Admin\Dsl\S;
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
    use HasWhen;
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

    /** Display label rendered above the input; defaults to a humanized $name when unset. */
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

    /** Marks the field required: flags it on the wire and adds a `required` validation rule. */
    public function required(): static
    {
        $this->opts['required'] = true;

        return $this->rules('required');
    }

    /**
     * Marks the field required only when the given condition holds: sets
     * meta.requiredIf (compiled client-side into the live asterisk) and
     * appends the equivalent server rule, derived from the Cond. Unlike
     * required(), this does NOT set opts['required'] - the asterisk is
     * conditional, not static.
     *
     * A `truthy` condition maps to required_if_accepted (true/1/on/yes) — boolean
     * input semantics; gate on a checkbox/boolean field, not on free text.
     */
    public function requiredIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $cond = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        $this->metaBag['requiredIf'] = $cond;

        return $this->rules(CondToRequiredRule::rule($cond));
    }

    /**
     * Sets the static "required" asterisk/UI marker only, with no rule.
     * For a field made required through some other mechanism (a composite
     * rule, a cross-field requiredIf already covering it) that still needs
     * the visual indicator.
     */
    public function markAsRequired(bool $state = true): static
    {
        $this->opts['required'] = $state;

        return $this;
    }

    /**
     * Appends Laravel validation rules, merged with any already collected.
     * Pass a `regex:` rule as an array element, never inline it in a
     * pipe-delimited string — the pattern's own `|` would be split on and
     * the string form throws for this reason.
     *
     * @param  string|list<string>  $rules
     */
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

    /**
     * Store the value as a per-locale map instead of a scalar. On a repeater,
     * this cascades to its sub-fields rather than translating the repeater's
     * own value (see isTranslatableField()); pair with rulesForLocale() to
     * validate each locale independently.
     */
    public function translatable(bool $value = true): static
    {
        $this->translatableFlag = $value;

        return $this;
    }

    /**
     * Rule set for one locale of a translatable field, replacing — not adding
     * to — whatever rules() would otherwise apply there. Only the default
     * content locale falls back to rules() when it has no override; every
     * other locale without one just gets 'nullable'. Unlike rules(), a
     * pipe string here is not guarded against an inline regex: pattern.
     */
    public function rulesForLocale(string $locale, string|array $rules): static
    {
        $list = is_string($rules) ? explode('|', $rules) : $rules;
        $this->localeRules[$locale] = array_values($list);

        return $this;
    }

    /**
     * True only for a leaf whose own value is a locale map. A container (a
     * repeater — the only kind carrying `fields`) has no value of its own to
     * translate: ->translatable() on it means "cascade to my sub-fields", so it
     * validates and serializes as a plain field while its children go per-locale.
     */
    public function isTranslatableField(): bool
    {
        return $this->translatableFlag === true && $this->childFields() === [];
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

    /**
     * Seeds the form value when the record has no key for this field. An
     * explicit key in the form's record() always wins — even
     * record(['x' => null]) keeps the null instead of this default.
     */
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

    /**
     * Escape hatch: writes $key directly into the serialized node options,
     * bypassing any dedicated fluent method. Key names are NOT validated
     * against the schema — a typo or unsupported key ships silently and only
     * fails (if at all) on the client. Prefer a real fluent method when one
     * exists; use this only for a wire key with no builder support yet.
     */
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

    public function labelText(): ?string
    {
        return $this->opts['label'] ?? null;
    }

    /**
     * Sub-fields of a container field, with a pending ->translatable() cascade
     * applied. Resolved on read rather than in translatable() so the two calls
     * commute — ->translatable()->fields([…]) and the reverse agree.
     *
     * Every child list key is walked, matching Node::nestedChildren(): set() is a
     * documented escape hatch, so sub-fields can arrive under 'children' as well
     * as 'fields'. Reading only 'fields' left those rules uncollected — the input
     * rendered but was never validated.
     *
     * @return list<mixed>
     */
    public function childFields(): array
    {
        $children = [];
        foreach ($this->childFieldsByKey() as $list) {
            $children = [...$children, ...$list];
        }

        return $children;
    }

    /**
     * Sub-fields grouped by the option key they arrived under, so toNode() writes
     * each list back where it came from instead of collapsing both into 'fields'.
     *
     * @return array<string, list<mixed>>
     */
    private function childFieldsByKey(): array
    {
        $out = [];
        foreach (Node::CHILD_LIST_KEYS as $key) {
            $nested = $this->opts[$key] ?? null;
            if (! is_array($nested) || $nested === []) {
                continue;
            }
            $normalized = S::normalizeChildren(array_values($nested));
            if ($normalized === []) {
                continue;
            }
            $out[$key] = $this->translatableFlag === true
                ? S::cascadeTranslatable($normalized)
                : $normalized;
        }

        return $out;
    }

    public function toNode(): Node
    {
        $options = [...$this->opts, ...$this->copyableOption()];
        $constraints = ConstraintMap::toConstraints($this->ruleList);
        if ($constraints !== []) {
            $options['constraints'] = $constraints;
        }
        foreach ($this->childFieldsByKey() as $key => $children) {
            $options[$key] = $children;
        }
        if ($this->isTranslatableField()) {
            $options['translatable'] = true;
        }

        return (new Node($this->kind(), $options, $this->name, $this->metaBag))
            ->when($this->isIncluded());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
