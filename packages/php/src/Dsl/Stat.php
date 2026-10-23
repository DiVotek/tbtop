<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Stat metric card — a scalar KPI tile with optional delta, icon, color, and sparkline.
 * Value may be a plain scalar or a Closure resolved server-side at page render (and,
 * with ->poll(), re-resolved on each data-endpoint request).
 */
final class Stat implements JsonSerializable
{
    use HasIcon;
    use HasTooltip;
    use HasWhen;
    use ResolvesClosures;
    use WithMeta;

    private const SPARKLINE_POSITIONS = ['inline', 'bottom'];

    private const SEMANTIC_COLORS = ['success', 'warning', 'danger'];

    private const MIN_POLL_SECONDS = 5;

    private mixed $value = null;

    private string|Closure|null $description = null;

    private string|Closure|null $descriptionColor = null;

    /** @var 'up'|'down'|Closure|null */
    private string|Closure|null $trend = null;

    /** @var array{text: string|Closure, direction: string|Closure}|null */
    private ?array $delta = null;

    private Color|string|Closure|null $color = null;

    private string|Closure|null $sparklineColor = null;

    /** @var list<int|float>|null */
    private ?array $sparkline = null;

    private string $sparklinePosition = 'inline';

    private int|Closure|null $pollSeconds = null;

    private ?string $url = null;

    private bool $newTab = false;

    public function __construct(
        private readonly string $label,
    ) {}

    public static function make(string $label): self
    {
        return new self($label);
    }

    /** The headline number/text. Accepts a scalar or a Closure resolved server-side at render time (and on each poll() tick). */
    public function value(mixed $value): self
    {
        $this->value = $value;

        return $this;
    }

    /**
     * Sub-label under the value, optionally tinted to carry meaning
     * ('success'/'warning'/'danger'); the default is muted text.
     *
     * Either argument may be a Closure; a closure-supplied color is checked
     * when it resolves. The description closure also re-runs on each poll() tick.
     *
     * @param  string|(Closure(): ?string)|null  $description
     * @param  string|(Closure(): string)|null  $color  One of self::SEMANTIC_COLORS ('success'|'warning'|'danger'),
     *                                                  or null (default) for the current muted text.
     */
    public function description(string|Closure|null $description, string|Closure|null $color = null): self
    {
        $this->description = $description;
        if ($color !== null) {
            $this->descriptionColor = $color instanceof Closure
                ? fn () => self::normalizeSemanticColor($color())
                : self::normalizeSemanticColor($color);
        }

        return $this;
    }

    /**
     * Change indicator (e.g. "+12%") rendered next to the value. $direction
     * is 'up', 'down' or 'flat' and picks the arrow and tint.
     *
     * @param  string|(Closure(): string)  $text
     * @param  'up'|'down'|'flat'|(Closure(): ('up'|'down'|'flat'))  $direction
     */
    public function delta(string|Closure $text, string|Closure $direction): self
    {
        $this->delta = ['text' => $text, 'direction' => $direction];

        return $this;
    }

    /**
     * Tint for the value/icon (a Color or a registered color token).
     *
     * @param  Color|string|(Closure(): (Color|string))  $color
     */
    public function color(Color|string|Closure $color): self
    {
        $this->color = $color;

        return $this;
    }

    /**
     * Small trend arrow rendered after the description, inheriting its color.
     * A Closure's result is checked when it resolves.
     *
     * @param  'up'|'down'|(Closure(): ('up'|'down'))  $direction
     */
    public function trend(string|Closure $direction): self
    {
        $this->trend = $direction instanceof Closure
            ? fn () => self::checkedTrend($direction())
            : self::checkedTrend($direction);

        return $this;
    }

    /**
     * Mini trend chart from a plain list of numbers — no axes or labels, so
     * the series only has to be ordered, not scaled.
     *
     * @param  list<int|float>  $numbers
     * @param  string  $position  One of self::SPARKLINE_POSITIONS ('inline'|'bottom').
     *                            'inline' (default, back-compat) renders under the card
     *                            content; 'bottom' pins it full-bleed to the card's bottom edge.
     */
    public function sparkline(array $numbers, string $position = 'inline'): self
    {
        if (! in_array($position, self::SPARKLINE_POSITIONS, true)) {
            throw new InvalidArgumentException(
                'Invalid sparkline position "'.$position.'". Allowed: '.implode(', ', self::SPARKLINE_POSITIONS).'.'
            );
        }
        $this->sparkline = $numbers;
        $this->sparklinePosition = $position;

        return $this;
    }

    /**
     * Tint applied to the sparkline chart. Default: current chart color. A
     * Closure's result is checked when it resolves.
     *
     * @param  string|(Closure(): string)  $color  One of success|warning|danger|primary.
     */
    public function sparklineColor(string|Closure $color): self
    {
        $this->sparklineColor = $color instanceof Closure
            ? fn () => self::checkedSparklineColor($color())
            : self::checkedSparklineColor($color);

        return $this;
    }

    /**
     * Make the whole card a link — an internal path navigates in place, an
     * external URL opens as a plain link.
     */
    public function url(string $url): self
    {
        $this->url = $url;

        return $this;
    }

    /** Open url() in a new browser tab instead of navigating in place. No effect without url(). */
    public function openUrlInNewTab(bool $condition = true): self
    {
        $this->newTab = $condition;

        return $this;
    }

    /**
     * Deprecated (removed in 1.0): use url()->openUrlInNewTab().
     *
     * @deprecated Use openUrlInNewTab().
     */
    public function openInNewTab(bool $newTab = true): self
    {
        trigger_error(
            'Stat::openInNewTab() is deprecated and will be removed in 1.0. Use url()->openUrlInNewTab() instead.',
            E_USER_DEPRECATED,
        );

        return $this->openUrlInNewTab($newTab);
    }

    /**
     * Poll the stat's data endpoint every $seconds, re-invoking the value
     * closure on each tick instead of once at page render. The 5-second floor
     * is enforced twice: below it this throws, and the client clamps whatever
     * reaches it. Stamps options.source so the client fetches from the page
     * data endpoint, keyed by this stat's label. A Closure's result is
     * checked against the floor when it resolves.
     *
     * @param  int|(Closure(): int)  $seconds
     */
    public function poll(int|Closure $seconds): self
    {
        $this->pollSeconds = $seconds instanceof Closure
            ? fn () => self::checkedPollSeconds($seconds())
            : self::checkedPollSeconds($seconds);

        return $this;
    }

    /**
     * Data-endpoint resolver for polling: re-invokes the value closure and
     * returns the refreshed descriptor. Null when poll() was never called —
     * DataController falls through to "not found" in that case.
     *
     * @return null|Closure(): array{value: mixed, description?: string, sparkline?: list<int|float>}
     */
    public function queryClosure(): ?Closure
    {
        if ($this->pollSeconds === null) {
            return null;
        }

        return function (): array {
            $out = ['value' => $this->resolveOpt($this->value)];
            if ($this->description !== null) {
                $out['description'] = $this->resolveOpt($this->description);
            }
            if ($this->sparkline !== null) {
                $out['sparkline'] = $this->sparkline;
            }

            return $out;
        };
    }

    public function toNode(): Node
    {
        $options = ['label' => $this->label, 'value' => $this->resolveOpt($this->value)];

        if ($this->description !== null) {
            $options['description'] = $this->resolveOpt($this->description);
        }
        if ($this->descriptionColor !== null) {
            $options['descriptionColor'] = $this->resolveOpt($this->descriptionColor);
        }
        if ($this->trend !== null) {
            $options['trend'] = $this->resolveOpt($this->trend);
        }
        if ($this->delta !== null) {
            $options['delta'] = [
                'text' => $this->resolveOpt($this->delta['text']),
                'direction' => $this->resolveOpt($this->delta['direction']),
            ];
        }
        if ($this->color !== null) {
            $color = $this->resolveOpt($this->color);
            $options['color'] = $color instanceof Color ? $color->value : $color;
        }
        if ($this->sparkline !== null) {
            $options['sparkline'] = $this->sparkline;
            if ($this->sparklinePosition !== 'inline') {
                $options['sparklinePosition'] = $this->sparklinePosition;
            }
        }
        if ($this->sparklineColor !== null) {
            $options['sparklineColor'] = $this->resolveOpt($this->sparklineColor);
        }
        if ($this->url !== null) {
            $options['url'] = $this->url;
            if ($this->newTab) {
                $options['newTab'] = true;
            }
        }
        if ($this->pollSeconds !== null) {
            $options['poll'] = $this->resolveOpt($this->pollSeconds);
            $options['source'] = $this->label;
        }

        return (new Node('stat', [...$options, ...$this->iconOption(), ...$this->tooltipOption()], null, $this->resolvedMeta()))
            ->when($this->isIncluded());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    private static function normalizeSemanticColor(mixed $color): string
    {
        if (! is_string($color) || ! in_array($color, self::SEMANTIC_COLORS, true)) {
            throw new InvalidArgumentException(
                'Invalid description color "'.self::shown($color).'". Allowed: '.implode(', ', self::SEMANTIC_COLORS).'.'
            );
        }

        return $color;
    }

    private static function checkedTrend(mixed $direction): string
    {
        if (! is_string($direction) || ! in_array($direction, ['up', 'down'], true)) {
            throw new InvalidArgumentException(
                'Invalid trend direction "'.self::shown($direction).'". Allowed: up, down.'
            );
        }

        return $direction;
    }

    private static function checkedSparklineColor(mixed $color): string
    {
        $allowed = [...self::SEMANTIC_COLORS, 'primary'];
        if (! is_string($color) || ! in_array($color, $allowed, true)) {
            throw new InvalidArgumentException(
                'Invalid sparkline color "'.self::shown($color).'". Allowed: '.implode(', ', $allowed).'.'
            );
        }

        return $color;
    }

    private static function checkedPollSeconds(mixed $seconds): int
    {
        if (! is_int($seconds) || $seconds < self::MIN_POLL_SECONDS) {
            throw new InvalidArgumentException(
                'Stat poll interval must be at least '.self::MIN_POLL_SECONDS.' seconds.'
            );
        }

        return $seconds;
    }

    private static function shown(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : get_debug_type($value);
    }
}
