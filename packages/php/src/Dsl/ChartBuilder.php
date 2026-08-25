<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
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
    use HasWhen;
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

    /**
     * Makes the chart dynamic: data comes from the page data endpoint instead
     * of $opts. $fn: fn(Request $request, array $params): array — $params
     * holds the current values of the params() fields keyed by field name
     * (empty array without params()). Return a list of flat rows (arrays or a
     * query result) containing the xKey/nameKey column and every series
     * dataKey, e.g. [['period' => '2026-08', 'count' => 12], ...].
     */
    public function query(callable $fn): static
    {
        $this->queryClosure = Closure::fromCallable($fn);
        $this->opts['source'] = $this->name;

        return $this;
    }

    /**
     * Filter fields rendered above the chart (regular field builders, e.g.
     * select('interval')->options([...])->default('month')). Their values
     * reach the query() closure as $params['name']. Text-ish kinds debounce
     * before refetching; every change costs one request, so keep the set small.
     *
     * @param  list<Field>  $fields
     */
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
     * Re-fetch the chart's data endpoint every $seconds. The 5-second floor is
     * enforced twice: below it this throws, and the client clamps whatever
     * reaches it. Only meaningful together with ->query().
     */
    public function poll(int $seconds): self
    {
        if ($seconds < self::MIN_POLL_SECONDS) {
            throw new \InvalidArgumentException(
                'Chart poll interval must be at least '.self::MIN_POLL_SECONDS.' seconds.'
            );
        }
        $this->opts['poll'] = $seconds;

        return $this;
    }

    /**
     * Escape hatch: writes $key directly into the serialized chart node
     * options, bypassing any dedicated fluent method. Key names are NOT
     * validated against the schema — a typo or unsupported key ships
     * silently. Prefer a real fluent method when one exists.
     */
    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function toNode(): Node
    {
        [$options, $optMeta] = Meta::split($this->opts);
        $meta = [...$optMeta, ...$this->metaBag];
        if ($this->paramFields !== []) {
            $options['params'] = array_map(fn (Field $f) => $f->toNode(), $this->paramFields);
        }

        return (new Node("chart:{$this->type}", [...$options, 'type' => $this->type], $this->name, $meta))
            ->when($this->isIncluded());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
