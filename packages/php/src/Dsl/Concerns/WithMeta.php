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
 * single `use`. Adopters pass resolvedMeta() (not $this->metaBag directly) to
 * the Node they emit, so a deferred disabled() value resolves without each
 * adopter remembering to do it.
 */
trait WithMeta
{
    use ResolvesClosures;

    /** @var array<string, mixed> */
    protected array $metaBag = [];

    /**
     * Sets one of the node meta keys directly: id, hidden, disabled, hiddenIf,
     * disabledIf. Unvalidated — any other key ships and the client ignores it.
     * For an arbitrary wire *option* use set() instead.
     */
    public function meta(string $key, mixed $value): static
    {
        $this->metaBag[$key] = $value;

        return $this;
    }

    /**
     * Client-side visibility: the node still ships on the wire and its value
     * still submits with the form even while hidden. Contrast with when(),
     * which drops the node from the wire entirely and 404s its endpoints.
     * Pass a Cond, or the shorthand ($field, $op, $value) — e.g.
     * hiddenIf('type', '=', 'guest'). $field resolves against the enclosing
     * form's values; on a table row action it resolves against the row's
     * columns instead (hiddenIf('status', '!=', 'pending')).
     */
    public function hiddenIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['hiddenIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    /**
     * Client-side evaluation: the field still ships on the wire and its
     * value still submits — only the input's interactivity is disabled.
     * Contrast with when(), which drops the node from the wire entirely.
     * Pass a Cond, or the shorthand ($field, $op, $value).
     */
    public function disabledIf(Cond|string $condOrField, string $op = '', mixed $value = null): static
    {
        $this->metaBag['disabledIf'] = $condOrField instanceof Cond
            ? $condOrField
            : Cond::fromShorthand($condOrField, $op, $value);

        return $this;
    }

    /**
     * Server-decided initial disabled state, e.g. disabled(fn () => ! $user->isAdmin()).
     * The node still ships and its value still submits: this is a starting
     * state, not access control — enforce permissions server-side, and use
     * disabledIf() for state that follows the form.
     *
     * @param  bool|(Closure(): bool)  $disabled
     */
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
            $meta['disabled'] = (bool) $this->resolveOpt($meta['disabled']);
        }

        return $meta;
    }
}
