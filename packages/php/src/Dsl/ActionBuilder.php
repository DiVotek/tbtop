<?php

namespace Tbtop\Admin\Dsl;

use Closure;
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

    /** @var 'sm'|'md'|'lg'|'full'|null */
    private ?string $modalSize = null;

    private const MODAL_SIZES = ['sm', 'md', 'lg', 'full'];

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
     * Set the modal dialog size. Only valid on modal actions.
     *
     * @param  'sm'|'md'|'lg'|'full'  $size
     */
    public function size(string $size): self
    {
        if (! in_array($size, self::MODAL_SIZES, true)) {
            throw new \InvalidArgumentException(
                "Invalid modal size \"{$size}\". Allowed: ".implode(', ', self::MODAL_SIZES).'.'
            );
        }

        $this->modalSize = $size;

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
                throw new LogicException("size() is only valid on modal actions (action \"{$this->name}\").");
            }
            $spec = [...$this->spec, 'size' => $this->modalSize];
        } else {
            $spec = $this->spec;
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
