<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Generic row list — "Recently updated pages" style widget. Items are a lazy
 * closure resolved at serialization time (same shape as Stat::value).
 */
final class ListBuilder implements JsonSerializable
{
    use WithMeta;

    private const COLORS = ['success', 'warning', 'danger', 'muted'];

    private ?Closure $itemsClosure = null;

    public function __construct(
        public readonly string $name,
    ) {}

    public static function make(string $name): self
    {
        return new self($name);
    }

    /**
     * @param  callable(): list<array{title: string, meta?: string, color?: string, url?: string}>  $fn
     */
    public function items(callable $fn): self
    {
        $this->itemsClosure = Closure::fromCallable($fn);

        return $this;
    }

    public function toNode(): Node
    {
        $items = $this->itemsClosure !== null ? ($this->itemsClosure)() : [];
        $items = array_map(self::normalizeItem(...), $items);

        return new Node('list', ['items' => $items], $this->name, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    /**
     * Author input is validated at runtime — closure results aren't statically typed.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private static function normalizeItem(array $item): array
    {
        if (! isset($item['title'])) {
            throw new InvalidArgumentException('List item requires a "title" key.');
        }

        $out = ['title' => (string) $item['title']];
        if (isset($item['meta'])) {
            $out['meta'] = (string) $item['meta'];
        }
        if (isset($item['color'])) {
            $out['color'] = self::normalizeColor((string) $item['color']);
        }
        if (isset($item['url'])) {
            $out['url'] = (string) $item['url'];
        }

        return $out;
    }

    private static function normalizeColor(string $color): string
    {
        if (! in_array($color, self::COLORS, true)) {
            throw new InvalidArgumentException(
                "Invalid list item color \"{$color}\". Allowed: ".implode(', ', self::COLORS).'.'
            );
        }

        return $color;
    }
}
