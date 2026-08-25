<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use Illuminate\Support\Facades\Gate;
use JsonSerializable;
use LogicException;
use Tbtop\Admin\Dsl\Concerns\HasIcon;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Concerns\HasTooltip;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
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
    use HasWhen;
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

    private bool $withoutValidation = false;

    private ?string $authorizeAbility = null;

    private mixed $authorizeArg = null;

    private const MODAL_SIZES = [
        'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full',
    ];

    private const BUTTON_SIZES = ['sm', 'md', 'lg'];

    public function __construct(public readonly string $name) {}

    /** Button/link text. */
    public function label(string $label): self
    {
        $this->opts['label'] = $label;

        return $this;
    }

    /** Visual color/tint of the trigger (e.g. 'danger' for a destructive action). */
    public function color(string $color): self
    {
        $this->opts['color'] = $color;

        return $this;
    }

    /** Count badge after the label. Pass a Color for the badge tint. */
    public function badge(string|int $count, ?Color $color = null): self
    {
        $this->opts['badge'] = (string) $count;
        if ($color !== null) {
            $this->opts['badgeColor'] = $color->value;
        }

        return $this;
    }

    /** Keyboard shortcut that triggers the action (e.g. 'mod+s'). */
    public function keybinding(string $keys): self
    {
        $this->opts['keybinding'] = $keys;

        return $this;
    }

    /** Visit spec: navigates to $href on click, one of the mutually exclusive action specs. @param  bool  $newTab  Open the target in a new browser tab. */
    public function visit(string $href, bool $newTab = false): self
    {
        return $this->setSpec(array_filter([
            'type' => 'visit',
            'href' => $href,
            'newTab' => $newTab ?: null,
        ], static fn (mixed $v): bool => $v !== null));
    }

    /**
     * Submit spec: one of the mutually exclusive action specs (visit/submit/
     * handle/modal/custom) — setting a second one throws. With $form omitted,
     * submits the form the action is rendered inside; pass a form name to
     * target a different form on the same page.
     */
    public function submit(?string $form = null): self
    {
        return $this->setSpec(array_filter(['type' => 'submit', 'form' => $form]));
    }

    /**
     * Server spec: one of the mutually exclusive action specs. $handler runs
     * server-side and must return an Effects instance (see Actions\Effects) —
     * a non-Effects return is treated as no effects. $needs declares which
     * payload sources are collected and passed to $handler: 'form' (validated
     * field values), 'row' (the record for a row action), 'selection' (checked
     * row keys for a bulk action).
     */
    public function handle(Closure $handler, array $needs = []): self
    {
        $this->handler = $handler;

        return $this->setSpec(['type' => 'server', 'needs' => $needs]);
    }

    /**
     * Turn the enclosing form's rules from a gate into a schema filter for this
     * action: the handler still receives only declared keys, but a field that
     * fails its rules no longer blocks the action. Lets a form-scoped action
     * (add a block, delete a row) run while the form is half-filled.
     *
     * Silently ignored on anything that is not a `handle()` with `'form'` in
     * its needs — there is nothing to opt out of there.
     */
    public function withoutValidation(bool $without = true): self
    {
        $this->withoutValidation = $without;

        return $this;
    }

    /**
     * Adds a confirmation dialog before the action fires. Composes with any
     * spec (visit/submit/handle/modal/custom) — unlike those, it is not
     * itself a spec and doesn't participate in the "exactly one" exclusivity.
     */
    public function confirm(string $title, ?string $description = null): self
    {
        $this->opts['confirm'] = array_filter([
            'title' => $title,
            'description' => $description,
        ]);

        return $this;
    }

    /**
     * Modal spec: one of the mutually exclusive action specs (visit/submit/
     * handle/modal/custom) — calling a second spec method on the same
     * action throws. $body renders inside the dialog; pass a FormBuilder to
     * collect input, or omit it for a plain content/confirmation modal.
     */
    public function modal(string $title, Node|FormBuilder|JsonSerializable|null $body = null, ?string $description = null): self
    {
        return $this->setSpec(array_filter([
            'type' => 'modal',
            'title' => $title,
            'description' => $description,
            'body' => S::normalizeChild($body),
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
     * Gate check (Gate::allows($ability, $arg)). A failing check drops the
     * action from the wire, the way Filament auto-hides — and the same check
     * is re-run authoritatively when the action fires, so a hidden action
     * cannot be triggered by hand-crafting the request.
     *
     * @see ChildInclusion for the omission, ActionController::isAuthorized() for the re-check
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

    /**
     * Custom spec: one of the mutually exclusive action specs. Dispatches to a
     * client-side handler registered via defineCustomAction($handler, ...) —
     * $params is passed through unchanged. A $handler name with no registered
     * handler throws client-side when the action fires, not at page load.
     */
    public function custom(string $handler, array $params = []): self
    {
        return $this->setSpec(['type' => 'custom', 'handler' => $handler, 'params' => $params]);
    }

    /**
     * Optional data source for a modal action: runs server-side when the modal
     * opens, receives the row/selection context, and returns data fed to the
     * modal body (e.g. a record to prefill a form). Not needed for a modal that
     * only collects input — CreateAction has none; EditAction uses it to load
     * the record.
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

    /**
     * Whether ->withoutValidation() actually lifts a form gate here — the same
     * condition toNode() writes `validate: false` under.
     *
     * Read this instead of the serialized node: toNode() throws for several
     * valid-at-runtime combinations (slideOver/modalWidth/query on a handler
     * action), and the request path must not depend on a node it never needs.
     */
    public function skipsFormValidation(): bool
    {
        return $this->withoutValidation
            && $this->spec !== null
            && self::consumesForm($this->spec);
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

        // Only written when disabled, so existing nodes stay byte-identical.
        if ($this->withoutValidation && self::consumesForm($spec)) {
            $spec = [...$spec, 'validate' => false];
        }

        return (new Node('action', [...$this->opts, ...$this->iconOption(), ...$this->tooltipOption(), 'spec' => $spec], $this->name, $this->metaBag))
            ->when($this->isIncluded());
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    /** @param  array<string, mixed>  $spec */
    private static function consumesForm(array $spec): bool
    {
        return ($spec['type'] ?? '') === 'server'
            && in_array('form', is_array($spec['needs'] ?? null) ? $spec['needs'] : [], true);
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
