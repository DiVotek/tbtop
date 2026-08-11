<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use stdClass;

final class Node implements JsonSerializable
{
    /**
     * Option keys holding a plain list of children, whatever the node's kind.
     * Public because Field walks the same keys — one list, so the two traversers
     * cannot drift apart again.
     */
    public const CHILD_LIST_KEYS = ['children', 'fields'];

    /** Option keys holding one nested child. */
    public const CHILD_KEYS = ['prefix', 'suffix'];

    /** @var array<string, mixed> */
    public readonly array $options;

    /**
     * Conditional existence. Node is immutable, so this cannot use the HasWhen
     * trait — when() returns a new instance instead of mutating. ChildInclusion
     * still reads it through isIncluded(), the same name the trait exposes.
     */
    private bool $included = true;

    /**
     * Children are filtered here rather than in the S factories because this
     * constructor is the one place every node passes through: a factory, a
     * builder's toNode(), or a hand-written `new Node($kind, [...])` — which is
     * how consumers author a custom block. Filtering upstream would miss the
     * last one.
     *
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly string $kind,
        array $options = [],
        public readonly ?string $name = null,
        public readonly array $meta = [],
    ) {
        $this->options = self::filterChildLists($options);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private static function filterChildLists(array $options): array
    {
        foreach (self::CHILD_LIST_KEYS as $key) {
            if (is_array($options[$key] ?? null)) {
                $options[$key] = ChildInclusion::filter(array_values($options[$key]));
            }
        }
        foreach (self::CHILD_KEYS as $key) {
            if (array_key_exists($key, $options)) {
                $child = S::normalizeChild($options[$key]);
                if ($child === null) {
                    unset($options[$key]);
                } else {
                    $options[$key] = $child;
                }
            }
        }

        return $options;
    }

    /** Conditional existence — see the HasWhen trait for the builder counterpart. */
    public function when(bool|Closure $condition): self
    {
        $clone = new self($this->kind, $this->options, $this->name, $this->meta);
        $clone->included = $condition instanceof Closure ? (bool) $condition() : $condition;

        return $clone;
    }

    public function isIncluded(): bool
    {
        return $this->included;
    }

    /**
     * Cascade translatable flag onto all descendant Fields.
     * Returns a new Node with the cascade applied (immutable).
     */
    public function translatable(): self
    {
        $newOpts = $this->options;
        foreach (['children', 'fields'] as $key) {
            if (isset($newOpts[$key]) && is_array($newOpts[$key])) {
                $newOpts[$key] = S::cascadeTranslatable($newOpts[$key]);
            }
        }
        if (isset($newOpts['tabs']) && is_array($newOpts['tabs'])) {
            $newOpts['tabs'] = array_map(static function (mixed $tab): mixed {
                if (is_array($tab) && isset($tab['body'])) {
                    $tab['body'] = S::cascadeTranslatable([$tab['body']])[0];
                }

                return $tab;
            }, $newOpts['tabs']);
        }

        $cascaded = new self($this->kind, $newOpts, $this->name, $this->meta);
        $cascaded->included = $this->included;

        return $cascaded;
    }

    /**
     * Nested children of a container Node for tree-walkers: every child list
     * key, plus every tab body when this is a tabs() node. A tab's body is a
     * single DSL value (Field|Node|TextBlock|...), not a list, so it is appended
     * as one more child rather than merged in.
     *
     * Both keys are walked, not the first one present: a node can carry
     * 'children' and 'fields' at once (the schema allows it, and Field::set()
     * reaches it), and stopping at 'children' made the 'fields' list invisible
     * to every walker built on this — rule collection, defaults, translatable
     * names. translatable() has always walked both; this now agrees with it.
     *
     * @return list<mixed>
     */
    public function nestedChildren(): array
    {
        $out = [];
        foreach (self::CHILD_LIST_KEYS as $key) {
            $nested = $this->options[$key] ?? null;
            if (is_array($nested)) {
                $out = [...$out, ...array_values($nested)];
            }
        }

        foreach (self::CHILD_KEYS as $key) {
            if (($this->options[$key] ?? null) !== null) {
                $out[] = $this->options[$key];
            }
        }

        foreach ($this->options['tabs'] ?? [] as $tab) {
            if (is_array($tab) && isset($tab['body'])) {
                $out[] = $tab['body'];
            }
        }

        return $out;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $out = [
            'kind' => $this->kind,
            'options' => $this->options === [] ? new stdClass : $this->options,
            'meta' => $this->meta === [] ? new stdClass : $this->meta,
        ];
        if ($this->name !== null) {
            $out['name'] = $this->name;
        }

        return $out;
    }
}
