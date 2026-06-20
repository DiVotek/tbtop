<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\WithMeta;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Chart node with an optional server-side data source.
 * With a query closure the client fetches from the page data endpoint;
 * without one it renders options.data statically.
 */
final class ChartBuilder implements JsonSerializable
{
    use WithMeta;

    private ?Closure $query = null;

    /** @var list<Field> */
    private array $paramFields = [];

    /** @param  array<string, mixed>  $opts */
    public function __construct(
        public readonly string $name,
        public readonly string $type,
        private array $opts = [],
    ) {}

    public function query(Closure $query): self
    {
        $this->query = $query;
        $this->opts['source'] = $this->name;

        return $this;
    }

    /** @param  list<Field>  $fields */
    public function params(array $fields): self
    {
        $this->paramFields = $fields;

        return $this;
    }

    /** @return list<Field> */
    public function paramFields(): array
    {
        return $this->paramFields;
    }

    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function queryClosure(): ?Closure
    {
        return $this->query;
    }

    public function toNode(): Node
    {
        [$options, $optMeta] = Meta::split($this->opts);
        $meta = [...$optMeta, ...$this->metaBag];
        if ($this->paramFields !== []) {
            $options['params'] = array_map(fn (Field $f) => $f->toNode(), $this->paramFields);
        }

        return new Node("chart:{$this->type}", [...$options, 'type' => $this->type], $this->name, $meta);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
