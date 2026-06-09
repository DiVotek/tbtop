<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;

/**
 * Chart node with an optional server-side data source.
 * With a query closure the client fetches from the page data endpoint;
 * without one it renders options.data statically.
 */
final class ChartBuilder implements JsonSerializable
{
    private ?Closure $query = null;

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
        [$options, $meta] = Meta::split($this->opts);

        return new Node("chart:{$this->type}", [...$options, 'type' => $this->type], $this->name, $meta);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
