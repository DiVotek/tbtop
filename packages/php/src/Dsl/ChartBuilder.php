<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;
use Tbtop\Admin\Dsl\Concerns\WithMeta;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Chart node with an optional server-side data source.
 * With a query closure the client fetches from the page data endpoint;
 * without one it renders options.data statically.
 */
final class ChartBuilder implements JsonSerializable
{
    use HasServerQuery;
    use ResolvesClosures;
    use WithMeta;

    private const MIN_POLL_SECONDS = 5;

    /** @var list<Field> */
    private array $paramFields = [];

    /** @param  array<string, mixed>  $opts */
    public function __construct(
        public readonly string $name,
        public readonly string $type,
        private array $opts = [],
    ) {}

    /** Overrides the trait: also flags the page data endpoint as this chart's source. */
    public function query(callable $fn): static
    {
        $this->queryClosure = Closure::fromCallable($fn);
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

    /**
     * Re-fetch the chart's data endpoint every $seconds (client-clamped to a
     * 5s minimum). Only meaningful together with ->query(). A Closure is
     * validated at resolution time (toNode()), not here.
     *
     * @param  int|(Closure(): int)  $seconds
     */
    public function poll(int|Closure $seconds): self
    {
        if (! $seconds instanceof Closure) {
            self::assertValidPollSeconds($seconds);
        }
        $this->opts['poll'] = $seconds;

        return $this;
    }

    private static function assertValidPollSeconds(int $seconds): void
    {
        if ($seconds < self::MIN_POLL_SECONDS) {
            throw new InvalidArgumentException(
                'Chart poll interval must be at least '.self::MIN_POLL_SECONDS.' seconds.'
            );
        }
    }

    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function toNode(): Node
    {
        [$options, $optMeta] = Meta::split($this->resolvedOpts());
        $meta = [...$optMeta, ...$this->resolvedMeta()];
        if ($this->paramFields !== []) {
            $options['params'] = array_map(fn (Field $f) => $f->toNode(), $this->paramFields);
        }

        return new Node("chart:{$this->type}", [...$options, 'type' => $this->type], $this->name, $meta);
    }

    /** @return array<string, mixed> */
    private function resolvedOpts(): array
    {
        $opts = $this->opts;
        if (array_key_exists('poll', $opts)) {
            $opts['poll'] = $this->resolveOpt($opts['poll']);
            self::assertValidPollSeconds($opts['poll']);
        }

        return $opts;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
