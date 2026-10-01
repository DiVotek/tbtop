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
     * Row source for the list. $fn runs server-side at serialization time (no
     * request payload — same lazy-resolution shape as Stat::value) and
     * returns each row either as ['title' => ..., 'meta'?, 'color'?, 'url'?,
     * 'openUrlInNewTab'?] or as $s->listItem(...); the two forms mix freely.
     * 'title' is required, 'color' is one of success|warning|danger|muted,
     * 'openUrlInNewTab' is a bool with no effect without 'url'. Unknown array
     * keys are ignored.
     *
     * @param  callable(): list<ListItem|array{title: string, meta?: string, color?: string, url?: string, openUrlInNewTab?: bool}>  $fn
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
     * @return array<string, mixed>
     */
    private static function normalizeItem(mixed $item): array
    {
        if ($item instanceof ListItem) {
            $item = $item->toArray();
        }
        if (! is_array($item)) {
            throw new InvalidArgumentException(
                'List item must be an array or a ListItem, got '.get_debug_type($item).'.'
            );
        }
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
        if (self::opensInNewTab($item) && isset($out['url'])) {
            $out['newTab'] = true;
        }

        return $out;
    }

    /** @param  array<mixed>  $item */
    private static function opensInNewTab(array $item): bool
    {
        $flag = $item['openUrlInNewTab'] ?? false;
        if (! is_bool($flag)) {
            throw new InvalidArgumentException("List item 'openUrlInNewTab' must be a bool.");
        }

        return $flag;
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
