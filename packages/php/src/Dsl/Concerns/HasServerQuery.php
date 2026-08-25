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

    /**
     * Server-side data closure — never serialized, re-resolved from the page
     * tree on each request. The closure contract depends on the adopter:
     * TableBuilder — fn(): Builder, must return a FRESH builder each call (it
     * is invoked once for rows and once per tab for counts); Tab — fn(Builder
     * $q): void, narrow the table builder in place; Relation — fn(array
     * $deps): Builder, the Eloquent query to pick from, $deps holding the
     * dependsOn() parents' current values — search text and the result cap are
     * applied on top by the endpoint (labelKey() LIKE, searchLimit()).
     */
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
