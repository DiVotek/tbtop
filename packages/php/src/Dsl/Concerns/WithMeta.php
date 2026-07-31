<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;
use Tbtop\Admin\Dsl\Cond;

/**
 * The universal node-envelope concern: arbitrary meta plus the conditional
 * visibility ops (hiddenIf / disabledIf) every Node-emitting builder shares.
 *
 * The wire grammar already makes node.meta universal (see structure.schema.json);
 * this trait is the builder-side counterpart so any builder participates with a
 * single `use`. Adopters call resolvedMeta() (not $this->metaBag directly) when
 * building the Node they emit, so deferred values (e.g. disabled()) resolve
 * without each adopter remembering to do it.
 */
trait WithMeta
{
    use ResolvesClosures;

    /** @var array<string, mixed> */
    protected array $metaBag = [];

    public function meta(string $key, mixed $value): static
    {
        $this->metaBag[$key] = $value;

        return $this;
    }

    public function hiddenIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['hiddenIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    public function disabledIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['disabledIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    /** @param  bool|(Closure(): bool)  $disabled */
    public function disabled(bool|Closure $disabled = true): static
    {
        $this->metaBag['disabled'] = $disabled;

        return $this;
    }

    /** @return array<string, mixed> */
    protected function resolvedMeta(): array
    {
        $meta = $this->metaBag;
        if (array_key_exists('disabled', $meta)) {
            $meta['disabled'] = $this->resolveOpt($meta['disabled']);
        }

        return $meta;
    }
}
