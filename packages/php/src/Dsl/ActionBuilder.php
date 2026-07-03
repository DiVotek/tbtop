<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use Illuminate\Support\Facades\Gate;
use JsonSerializable;
use LogicException;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\WithMeta;

/**
 * Fluent action surface — DSL boundary, method count is the API.
 * Exactly one spec per action: visit | submit | server (handle) | modal | custom.
 */
final class ActionBuilder implements JsonSerializable
{
    use HasIcon;
    use HasServerQuery;
    use HasTooltip;
    use WithMeta;

    /** @var array<string, mixed> */
    private array $opts = [];

    /** @var array<string, mixed>|null */
    private ?array $spec = null;

    private ?Closure $handler = null;

    /** @var list<string> */
    private array $queryNeeds = [];

    /** @var 'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'full'|null */
    private ?string $modalSize = null;

    private bool $slideOver = false;

    private ?string $authorizeAbility = null;

    private mixed $authorizeArg = null;

    private const MODAL_SIZES = [
        'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full',
    ];

    private const BUTTON_SIZES = ['sm', 'md', 'lg'];

    public function __construct(public readonly string $name) {}

    public function label(string $label): self
    {
        $this->opts['label'] = $label;

        return $this;
    }

    public function color(string $color): self
    {
        $this->opts['color'] = $color;

        return $this;
    }

    public function keybinding(string $keys): self
    {
        $this->opts['keybinding'] = $keys;

        return $this;
    }

    public function visit(string $href): self
    {
        return $this->setSpec(['type' => 'visit', 'href' => $href]);
    }

    public function submit(?string $form = null): self
    {
        return $this->setSpec(array_filter(['type' => 'submit', 'form' => $form]));
    }

    /** @param  list<string>  $needs Payload sources: form | row | selection. */
    public function handle(Closure $handler, array $needs = []): self
    {
        $this->handler = $handler;

        return $this->setSpec(['type' => 'server', 'needs' => $needs]);
    }

    public function confirm(string $title, ?string $description = null): self
    {
        $this->opts['confirm'] = array_filter([
            'title' => $title,
            'description' => $description,
        ]);

        return $this;
    }

    public function modal(string $title, Node|FormBuilder|JsonSerializable|null $body = null, ?string $description = null): self
    {
        return $this->setSpec(array_filter([
            'type' => 'modal',
            'title' => $title,
            'description' => $description,
            'body' => $body,
        ]));
    }

    /**
     * Set the modal dialog width. Only valid on modal actions.
     *
     * @param  string  $width  One of self::MODAL_SIZES ('sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'|'6xl'|'7xl'|'full')
     */
    public function modalWidth(string $width): self
    {
        if (! in_array($width, self::MODAL_SIZES, true)) {
            throw new \InvalidArgumentException(
                "Invalid modal width \"{$width}\". Allowed: ".implode(', ', self::MODAL_SIZES).'.'
            );
        }
        $this->modalSize = $width;

        return $this;
    }

    /** Render the modal as a right-anchored, full-height slide-over panel. */
    public function slideOver(bool $slideOver = true): self
    {
        $this->slideOver = $slideOver;

        return $this;
    }

    /**
     * Server-side Gate check. A failing check omits the action from the wire
     * entirely (mirrors Filament's Gate::allows() auto-hide) — callers MUST
     * filter with isAuthorized() at every collection point before toNode().
     */
    public function authorize(string $ability, mixed $arg = null): self
    {
        $this->authorizeAbility = $ability;
        $this->authorizeArg = $arg;

        return $this;
    }

    /** True when no ability was set, or the current user passes the Gate check. */
    public function isAuthorized(): bool
    {
        if ($this->authorizeAbility === null) {
            return true;
        }

        return Gate::allows($this->authorizeAbility, $this->authorizeArg);
    }

    /**
     * Drop unauthorized actions from a mixed list before it reaches the wire.
     * Non-ActionBuilder items (Node, e.g. actionGroup/dropdown) pass through —
     * they filter their own children when built.
     *
     * @param  list<mixed>  $actions
     * @return list<mixed>
     */
    public static function filterAuthorized(array $actions): array
    {
        return array_values(array_filter(
            $actions,
            static fn (mixed $a): bool => ! ($a instanceof self) || $a->isAuthorized(),
        ));
    }

    /**
     * Set the trigger button size.
     *
     * @param  string  $size  One of self::BUTTON_SIZES ('sm'|'md'|'lg')
     */
    public function size(string $size): self
    {
        if (! in_array($size, self::BUTTON_SIZES, true)) {
            throw new \InvalidArgumentException(
                "Invalid button size \"{$size}\". Allowed: ".implode(', ', self::BUTTON_SIZES).'.'
            );
        }
        $this->opts['size'] = $size;

        return $this;
    }

    /** Render the trigger as an outlined button. */
    public function outlined(bool $outlined = true): self
    {
        $this->opts['outlined'] = $outlined;

        return $this;
    }

    /** Render the trigger styled as a link. */
    public function link(): self
    {
        $this->opts['as'] = 'link';

        return $this;
    }

    /** Render the trigger styled as a button (the default). */
    public function button(): self
    {
        $this->opts['as'] = 'button';

        return $this;
    }

    /** @param  array<string, mixed>  $params */
    public function custom(string $handler, array $params = []): self
    {
        return $this->setSpec(['type' => 'custom', 'handler' => $handler, 'params' => $params]);
    }

    /**
     * Backend data source for a modal action. Overrides the trait to also track
     * the payload sources the closure needs. The closure runs server-side when
     * the modal opens, receives the row/selection context, and returns arbitrary
     * data fed to the modal body (e.g. a record to prefill a form).
     *
     * @param  list<string>  $needs  Payload sources: row | selection | form.
     */
    public function query(callable $fn, array $needs = ['row']): static
    {
        $this->queryClosure = Closure::fromCallable($fn);
        $this->queryNeeds = $needs;

        return $this;
    }

    public function handler(): ?Closure
    {
        return $this->handler;
    }

    public function toNode(): Node
    {
        if ($this->spec === null) {
            throw new LogicException("Action \"{$this->name}\" needs one of visit/submit/handle/modal/custom.");
        }

        if ($this->modalSize !== null) {
            if (($this->spec['type'] ?? '') !== 'modal') {
                throw new LogicException("modalWidth() is only valid on modal actions (action \"{$this->name}\").");
            }
            $spec = [...$this->spec, 'size' => $this->modalSize];
        } else {
            $spec = $this->spec;
        }

        if ($this->slideOver) {
            if (($spec['type'] ?? '') !== 'modal') {
                throw new LogicException("slideOver() is only valid on modal actions (action \"{$this->name}\").");
            }
            $spec = [...$spec, 'slideOver' => true];
        }

        if ($this->queryClosure !== null) {
            if (($spec['type'] ?? '') !== 'modal') {
                throw new LogicException("query() is only valid on modal actions (action \"{$this->name}\").");
            }
            $spec = [...$spec, 'query' => true, 'queryNeeds' => $this->queryNeeds];
        }

        return new Node('action', [...$this->opts, ...$this->iconOption(), ...$this->tooltipOption(), 'spec' => $spec], $this->name, $this->metaBag);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    /** @param  array<string, mixed>  $spec */
    private function setSpec(array $spec): self
    {
        if ($this->spec !== null) {
            throw new LogicException("Action \"{$this->name}\" already has a spec ({$this->spec['type']}).");
        }
        $this->spec = $spec;

        return $this;
    }
}
