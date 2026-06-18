<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Panels\CurrentPanel;

final class FormBuilder implements JsonSerializable
{
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

    /** @param  array<string, mixed>  $record Initial form data, lands in page props. */
    public function record(array $record): self
    {
        $this->record = $record;

        return $this;
    }

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

    /** @return array<string, mixed> */
    public function recordData(): array
    {
        return TranslatableRecord::normalize($this->record, $this->children);
    }

    /** Laravel validation rules collected from descendant fields. @return array<string, list<string>> */
    public function collectRules(): array
    {
        return RuleWalker::collect($this->children);
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
     * Find a Relation field with a query closure by name, walking nested children.
     * Returns null when not found.
     */
    public function findRelationField(string $name): ?Relation
    {
        return self::searchRelation($this->children, $name);
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
     * @param  list<mixed>  $children
     * @param  callable(Field): bool  $matches
     */
    private static function searchField(array $children, callable $matches): ?Field
    {
        foreach ($children as $child) {
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
            $nested = $child->options['children'] ?? $child->options['fields'] ?? [];

            return is_array($nested) ? array_values($nested) : [];
        }

        return [];
    }

    public function toNode(): Node
    {
        $options = ['name' => $this->name, 'children' => $this->children];

        if ($this->guardUnsaved !== null) {
            $options['guardUnsaved'] = $this->guardUnsaved;
        } elseif (! self::guardUnsavedConfigDefault()) {
            $options['guardUnsaved'] = false;
        }

        return new Node('form', $options, $this->name);
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
