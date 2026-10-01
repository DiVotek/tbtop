<?php

namespace Tbtop\Admin\Dsl;

/**
 * Fluent form of one ListBuilder::items() row — `$s->listItem('Post 1')`. An
 * equal alternative to the array form, not a replacement: both go through the
 * same normalization, so validation and the wire item are identical.
 */
final class ListItem
{
    private ?string $meta = null;

    private ?string $color = null;

    private ?string $url = null;

    private bool $openUrlInNewTab = false;

    public function __construct(public readonly string $title) {}

    /** Muted secondary text on the right of the row (e.g. "2h ago"). */
    public function meta(string $meta): self
    {
        $this->meta = $meta;

        return $this;
    }

    /** Status dot color: success|warning|danger|muted (validated at serialization). */
    public function color(string $color): self
    {
        $this->color = $color;

        return $this;
    }

    /**
     * Make the row a link — an internal path navigates in place, an external
     * URL opens as a plain link.
     */
    public function url(string $url): self
    {
        $this->url = $url;

        return $this;
    }

    /** Open url() in a new browser tab instead of navigating in place. No effect without url(). */
    public function openUrlInNewTab(bool $condition = true): self
    {
        $this->openUrlInNewTab = $condition;

        return $this;
    }

    /**
     * The array authoring form of this row, which ListBuilder normalizes.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return array_filter([
            'title' => $this->title,
            'meta' => $this->meta,
            'color' => $this->color,
            'url' => $this->url,
            'openUrlInNewTab' => $this->openUrlInNewTab,
        ], static fn (mixed $value): bool => $value !== null);
    }
}
