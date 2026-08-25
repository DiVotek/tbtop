<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

/**
 * Conditional existence: a node excluded by when() is absent from the wire and
 * its endpoints answer 404. Distinct from the client-side hiddenIf/disabledIf,
 * which react to form state on a node that does exist.
 *
 * The closure is resolved once per builder, not once per read, because the
 * predicate is consulted several times during one page assembly (serialization,
 * plus a controller guard re-resolving the page for an endpoint request).
 */
trait HasWhen
{
    private bool|Closure $whenCondition = true;

    private ?bool $whenResolved = null;

    /**
     * Server-side existence gate: false (or a closure resolving falsy) means
     * the node is dropped before serialization — absent from the wire, and
     * any endpoint scoped to it (action, query, data) answers 404. Not the
     * same as hiddenIf()/disabledIf(), which ship the node and let the
     * client hide/disable it while its value still submits.
     */
    public function when(bool|Closure $condition): static
    {
        $this->whenCondition = $condition;
        $this->whenResolved = null;

        return $this;
    }

    public function isIncluded(): bool
    {
        if ($this->whenResolved === null) {
            $this->whenResolved = $this->whenCondition instanceof Closure
                ? (bool) ($this->whenCondition)()
                : $this->whenCondition;
        }

        return $this->whenResolved;
    }
}
