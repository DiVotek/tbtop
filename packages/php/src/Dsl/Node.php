<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

final class Node implements JsonSerializable
{
    /**
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly string $kind,
        public readonly array $options = [],
        public readonly ?string $name = null,
        public readonly array $meta = [],
    ) {}

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

        return new self($this->kind, $newOpts, $this->name, $this->meta);
    }

    /**
     * Nested children of a container Node for tree-walkers: 'children'/'fields'
     * directly, plus every tab body when this is a tabs() node. A tab's body is a
     * single DSL value (Field|Node|TextBlock|...), not a list, so it is appended
     * as one more child rather than merged in.
     *
     * @return list<mixed>
     */
    public function nestedChildren(): array
    {
        $nested = $this->options['children'] ?? $this->options['fields'] ?? [];
        $out = is_array($nested) ? array_values($nested) : [];

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
