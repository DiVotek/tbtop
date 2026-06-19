<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

/**
 * Shared server-side data-source closure. The closure is re-resolved per request
 * from the page tree by the HTTP layer and is NEVER serialized to the wire.
 *
 * Adopters that need a side-effect on assignment (e.g. setting an opts key, or
 * tracking payload `needs`) override query() with the same universal signature
 * and reuse this $queryClosure property + accessor.
 */
trait HasServerQuery
{
    /** Server-only — never serialized to the wire. */
    protected ?Closure $queryClosure = null;

    public function query(callable $fn): static
    {
        $this->queryClosure = Closure::fromCallable($fn);

        return $this;
    }

    public function queryClosure(): ?Closure
    {
        return $this->queryClosure;
    }
}
