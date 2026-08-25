<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Panels\CurrentPanel;

final class FormBuilder implements JsonSerializable
{
    use HasWhen;

    /** @var list<mixed> */
    private array $children = [];

    /** @var array<string, mixed> */
    private array $record = [];

    private ?Closure $onSubmit = null;

    private ?bool $guardUnsaved = null;

    /** @param  list<mixed>  $children Nodes and builders. */
    public function __construct(public readonly string $name, array $children = [])
    {
        $this->children = $children;
    }

    /**
     * Seeds initial form data (lands in page props). Explicit keys here win
     * over a field's own default() — RecordDefaults only fills in keys absent
     * from $record, so record(['x' => null]) keeps the explicit null instead
     * of the field default. A scalar value for a translatable field is
     * expanded into a per-locale map (see TranslatableRecord::normalize),
     * with the scalar assigned to the default content locale.
     *
     * @param  array<string, mixed>  $record  Initial form data, lands in page props.
     */
    public function record(array $record): self
    {
        $this->record = $record;

        return $this;
    }

    /**
     * Server-side handler run after validation passes, never serialized.
     * It receives an ActionCtx (validated input at $ctx->form, plus user,
     * request and route params) — not a bare array. Return an Effects
     * instance, or a string to redirect there.
     */
    public function onSubmit(Closure $handler): self
    {
        $this->onSubmit = $handler;

        return $this;
    }

    /** Per-form override for the unsaved-changes navigation guard. */
    public function guardUnsaved(bool $enabled): self
    {
        $this->guardUnsaved = $enabled;

        return $this;
    }

    public function submitHandler(): ?Closure
    {
        return $this->onSubmit;
    }

    /**
     * Defaults seed before normalize, so a scalar default on a translatable
     * field is expanded into a locale map like any other value.
     *
     * @return array<string, mixed>
     */
    public function recordData(): array
    {
        $children = $this->includedChildren();
        $seeded = RecordDefaults::apply($this->record, $children);

        return TranslatableRecord::normalize($seeded, $children);
    }

    /** Laravel validation rules collected from descendant fields. @return array<string, list<string>> */
    public function collectRules(): array
    {
        return RuleWalker::collect($this->includedChildren());
    }

    /** Validator attribute labels (->label()) keyed like collectRules(). @return array<string, string> */
    public function collectAttributes(): array
    {
        return RuleWalker::collectAttributes($this->includedChildren());
    }

    /**
     * The children that exist, for the walkers that read the list directly
     * instead of going through toNode(). An excluded field must not contribute
     * a rule (the client never renders the key, so a `required` on it makes the
     * form unsubmittable) nor a ->default() (recordData() ships into page props,
     * leaking a value the author hid).
     *
     * Only the top level needs filtering: everything below descends through
     * Node::nestedChildren() or Field::childFields(), both of which already
     * carry the verdict, and an excluded container is dropped whole here.
     *
     * @return list<mixed>
     */
    private function includedChildren(): array
    {
        return ChildInclusion::filter($this->children);
    }

    /**
     * Find a Select field by name that has a creatable closure, walking nested children.
     * Returns null when not found.
     */
    public function findCreatableSelect(string $name): ?Select
    {
        return self::searchCreatable($this->children, $name);
    }

    /**
     * Find a Select field with a query closure by name, walking nested children.
     * Returns null when not found.
     */
    public function findQueryableSelect(string $name): ?Select
    {
        return self::searchQueryableSelect($this->children, $name);
    }

    /**
     * Find a Relation field with a query closure by name, walking nested children.
     * Returns null when not found.
     */
    public function findRelationField(string $name): ?Relation
    {
        return self::searchRelation($this->children, $name);
    }

    /**
     * Find a Daterange field with a disabledRanges closure by name, walking nested children.
     * Returns null when not found.
     */
    public function findDaterangeField(string $name): ?Daterange
    {
        $found = self::searchField(
            $this->children,
            static fn (Field $f): bool => $f instanceof Daterange
                && $f->name === $name
                && $f->disabledRangesClosure() !== null,
        );

        return $found instanceof Daterange ? $found : null;
    }

    /**
     * Find a liveRegion by name, walking nested children. Same exclusion rule
     * as searchField(): a when(false) subtree must not resolve here, or the
     * live-region endpoint keeps serving content the user never received.
     */
    public function findLiveRegion(string $name): ?LiveRegionBuilder
    {
        return self::searchLiveRegion($this->children, $name);
    }

    /** @param  list<mixed>  $children */
    private static function searchLiveRegion(array $children, string $name): ?LiveRegionBuilder
    {
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof LiveRegionBuilder && $child->name === $name) {
                return $child;
            }
            $found = self::searchLiveRegion(self::nestedChildren($child), $name);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Find an Upload field by name, walking nested children.
     * Returns null when not found.
     */
    public function findUploadField(string $name): ?Upload
    {
        $found = self::searchField(
            $this->children,
            static fn (Field $f): bool => $f instanceof Upload && $f->name === $name,
        );

        return $found instanceof Upload ? $found : null;
    }

    /**
     * Every Upload field on the form, walking nested children.
     *
     * @return list<Upload>
     */
    public function uploadFields(): array
    {
        $out = [];
        foreach (self::collectFields($this->children, static fn (Field $f): bool => $f instanceof Upload) as $field) {
            if ($field instanceof Upload) {
                $out[] = $field;
            }
        }

        return $out;
    }

    /** @param  list<mixed>  $children */
    private static function searchCreatable(array $children, string $name): ?Select
    {
        $found = self::searchField(
            $children,
            static fn (Field $f): bool => $f instanceof Select
                && $f->name === $name
                && $f->creatableClosure() !== null,
        );

        return $found instanceof Select ? $found : null;
    }

    /** @param  list<mixed>  $children */
    private static function searchQueryableSelect(array $children, string $name): ?Select
    {
        $found = self::searchField(
            $children,
            static fn (Field $f): bool => $f instanceof Select
                && $f->name === $name
                && $f->queryClosure() !== null,
        );

        return $found instanceof Select ? $found : null;
    }

    /** @param  list<mixed>  $children */
    private static function searchRelation(array $children, string $name): ?Relation
    {
        $found = self::searchField(
            $children,
            static fn (Field $f): bool => $f instanceof Relation
                && $f->name === $name
                && $f->queryClosure() !== null,
        );

        return $found instanceof Relation ? $found : null;
    }

    /**
     * Depth-first walk of form children, returning the first Field the
     * predicate accepts. Recurses into nested fields and Node containers.
     *
     * Excluded subtrees are skipped whole: this walk is what the field
     * endpoints (upload, select options/create, relation search) resolve a
     * field by name through, so a when(false) field must be unreachable here
     * or the endpoint stays live for a field that never reached the wire.
     *
     * @param  list<mixed>  $children
     * @param  callable(Field): bool  $matches
     */
    private static function searchField(array $children, callable $matches): ?Field
    {
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof Field && $matches($child)) {
                return $child;
            }
            $nested = self::nestedChildren($child);
            if ($nested !== []) {
                $found = self::searchField($nested, $matches);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * Depth-first collect of every Field the predicate accepts. Recurses into
     * nested fields and Node containers.
     *
     * @param  list<mixed>  $children
     * @param  callable(Field): bool  $matches
     * @return list<Field>
     */
    private static function collectFields(array $children, callable $matches): array
    {
        $out = [];
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof Field && $matches($child)) {
                $out[] = $child;
            }
            $nested = self::nestedChildren($child);
            if ($nested !== []) {
                $out = [...$out, ...self::collectFields($nested, $matches)];
            }
        }

        return $out;
    }

    /**
     * Child fields nested inside a Field or a Node container.
     *
     * @return list<mixed>
     */
    private static function nestedChildren(mixed $child): array
    {
        if ($child instanceof Field) {
            return $child->childFields();
        }
        if ($child instanceof Node) {
            return $child->nestedChildren();
        }

        return [];
    }

    public function toNode(): Node
    {
        $this->seedRecordDependents();
        $options = ['name' => $this->name, 'children' => $this->children];

        if ($this->guardUnsaved !== null) {
            $options['guardUnsaved'] = $this->guardUnsaved;
        } elseif (! self::guardUnsavedConfigDefault()) {
            $options['guardUnsaved'] = false;
        }

        return (new Node('form', $options, $this->name))->when($this->isIncluded());
    }

    /**
     * Every included liveRegion's initial render and every disabledRanges()
     * daterange's initial ranges use this form's record values; toNode() runs
     * before any child serializes, so seeding here covers every serialization
     * path.
     */
    private function seedRecordDependents(): void
    {
        $children = $this->includedChildren();
        $regions = self::collectLiveRegions($children);
        $dateranges = self::collectDaterangesWithRanges($children);
        if ($regions === [] && $dateranges === []) {
            return;
        }
        $record = $this->recordData();
        foreach ($regions as $region) {
            $region->seedInitialDeps($record);
        }
        foreach ($dateranges as $field) {
            $field->seedInitialDeps($record);
        }
    }

    /**
     * @param  list<mixed>  $children
     * @return list<Daterange>
     */
    private static function collectDaterangesWithRanges(array $children): array
    {
        $out = [];
        $matches = static fn (Field $f): bool => $f instanceof Daterange
            && $f->disabledRangesClosure() !== null;
        foreach (self::collectFields($children, $matches) as $field) {
            if ($field instanceof Daterange) {
                $out[] = $field;
            }
        }

        return $out;
    }

    /**
     * @param  list<mixed>  $children
     * @return list<LiveRegionBuilder>
     */
    private static function collectLiveRegions(array $children): array
    {
        $out = [];
        foreach ($children as $child) {
            if (! ChildInclusion::isConditionMet($child)) {
                continue;
            }
            if ($child instanceof LiveRegionBuilder) {
                $out[] = $child;
            }
            $out = [...$out, ...self::collectLiveRegions(self::nestedChildren($child))];
        }

        return $out;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    /** Panel default; true when no panel is bound — client defaults to guarded. */
    private static function guardUnsavedConfigDefault(): bool
    {
        return CurrentPanel::current()?->unsavedGuard() ?? true;
    }
}
