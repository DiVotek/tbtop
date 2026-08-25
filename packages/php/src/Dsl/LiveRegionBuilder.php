<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
use Tbtop\Admin\Dsl\Concerns\WithMeta;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Server-rendered region that re-renders when declared form fields change:
 * the client POSTs the current values to the live-region endpoint, the
 * render closure runs again, and the returned nodes replace the content.
 *
 * Contract: the closure runs at page assembly (options.initial) and again per
 * endpoint request, so it must be a pure function of $deps + captured scope.
 * It may return display nodes only — a form field here would mean a dynamic
 * form schema (validation, dirty tracking, names), which forms do not support.
 * hiddenIf() hides the region client-side without gating the endpoint; the
 * access boundary is when(), which the endpoint honours with a 404.
 *
 * Actions in the content must be deps-stable: handlers resolve by name at
 * dispatch with *initial* deps, so vary visibility, never node existence.
 */
final class LiveRegionBuilder implements JsonSerializable
{
    use HasWhen;
    use WithMeta;

    /** @var list<string> */
    private array $dependsOn = [];

    private ?Closure $renderClosure = null;

    /** @var array<string, string> */
    private array $initialDeps = [];

    public function __construct(public readonly string $name) {}

    /**
     * Declare the form field(s) whose value changes reload this region.
     * Their current values reach the render closure as ['field' => value].
     *
     * @param  string|list<string>  $fields
     */
    public function dependsOn(string|array $fields): self
    {
        $this->dependsOn = is_string($fields) ? [$fields] : $fields;

        return $this;
    }

    /**
     * The region's content, re-rendered server-side each time a declared
     * dependsOn() field changes (one round-trip per change). $fn receives
     * only the dependsOn()-filtered deps, not the full form state, and must
     * return display nodes only — no fields.
     *
     * @param  callable(array<string, string>, S): mixed  $fn  Returns a node or a list of nodes.
     */
    public function render(callable $fn): self
    {
        $this->renderClosure = Closure::fromCallable($fn);

        return $this;
    }

    /** @return list<string> */
    public function dependsOnFields(): array
    {
        return $this->dependsOn;
    }

    /**
     * FormBuilder seeds this during serialization so the initial render uses
     * the form record's values — an edit form opens already up to date.
     *
     * @param  array<string, mixed>  $record
     */
    public function seedInitialDeps(array $record): void
    {
        $this->initialDeps = DependencyFilter::filter($this->dependsOn, $record);
    }

    /**
     * @param  array<string, mixed>  $deps
     * @return list<mixed>
     */
    public function renderWith(array $deps): array
    {
        $closure = $this->renderClosure;
        if ($closure === null) {
            throw new InvalidArgumentException(
                "liveRegion \"{$this->name}\" needs a render() closure.",
            );
        }

        $result = $closure(DependencyFilter::filter($this->dependsOn, $deps), new S);
        $nodes = is_array($result) ? array_values($result) : [$result];
        $this->assertDisplayOnly($nodes);

        return ChildInclusion::filter($nodes);
    }

    /**
     * The display-only contract, enforced: a field inside a region would mean
     * a dynamic form schema (validation, dirty tracking, submitted names),
     * which forms do not support. The kind set stays open — containers and
     * custom display blocks pass; only form fields are rejected.
     *
     * @param  list<mixed>  $nodes
     */
    private function assertDisplayOnly(array $nodes): void
    {
        foreach ($nodes as $node) {
            if ($node instanceof Field) {
                throw new InvalidArgumentException(
                    "liveRegion \"{$this->name}\" render() returned field \"{$node->name}\" — regions may contain display nodes only.",
                );
            }
            if ($node instanceof Node) {
                $this->assertDisplayOnly($node->nestedChildren());
            }
        }
    }

    public function toNode(): Node
    {
        $options = [
            'dependsOn' => $this->dependsOn,
            // Deps the initial content was rendered with — a late-mounting
            // region compares against them to detect stale initial content.
            'initialDeps' => (object) $this->initialDeps,
            'initial' => $this->renderWith($this->initialDeps),
        ];

        return (new Node('liveRegion', $options, $this->name, $this->metaBag))
            ->when($this->isIncluded());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
