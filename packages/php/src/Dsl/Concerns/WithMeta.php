<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Tbtop\Admin\Dsl\Cond;

/**
 * The universal node-envelope concern: arbitrary meta plus the conditional
 * visibility ops (hiddenIf / disabledIf) every Node-emitting builder shares.
 *
 * The wire grammar already makes node.meta universal (see structure.schema.json);
 * this trait is the builder-side counterpart so any builder participates with a
 * single `use`. Adopters pass $this->metaBag to the Node they emit.
 */
trait WithMeta
{
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
}
