<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use Illuminate\Container\Container;
use Illuminate\Contracts\Config\Repository;
use JsonSerializable;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Select;

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

    /** @param  list<mixed>  $children */
    private static function searchCreatable(array $children, string $name): ?Select
    {
        foreach ($children as $child) {
            if ($child instanceof Select
                && $child->name === $name
                && $child->creatableClosure() !== null
            ) {
                return $child;
            }
            if ($child instanceof Field) {
                $sub = $child->childFields();
                if ($sub !== []) {
                    $found = self::searchCreatable($sub, $name);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
            if ($child instanceof Node) {
                $nested = $child->options['children'] ?? $child->options['fields'] ?? [];
                if (is_array($nested)) {
                    $found = self::searchCreatable(array_values($nested), $name);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
        }

        return null;
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

    /** True when no container/config available — client defaults to guarded. */
    private static function guardUnsavedConfigDefault(): bool
    {
        $container = Container::getInstance();
        if (! $container->bound('config')) {
            return true;
        }

        /** @var Repository $config */
        $config = $container->make('config');

        return (bool) $config->get('tbtop-admin.unsaved_guard', true);
    }
}
