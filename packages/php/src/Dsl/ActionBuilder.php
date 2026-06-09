<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use LogicException;

/**
 * Fluent action surface — DSL boundary, method count is the API.
 * Exactly one spec per action: visit | submit | server (handle) | modal | custom.
 */
final class ActionBuilder implements JsonSerializable
{
    /** @var array<string, mixed> */
    private array $opts = [];

    /** @var array<string, mixed>|null */
    private ?array $spec = null;

    private ?Closure $handler = null;

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

    public function modal(string $title, Node|FormBuilder|null $body = null, ?string $description = null): self
    {
        return $this->setSpec(array_filter([
            'type' => 'modal',
            'title' => $title,
            'description' => $description,
            'body' => $body,
        ]));
    }

    /** @param  array<string, mixed>  $params */
    public function custom(string $handler, array $params = []): self
    {
        return $this->setSpec(['type' => 'custom', 'handler' => $handler, 'params' => $params]);
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

        return new Node('action', [...$this->opts, 'spec' => $this->spec], $this->name);
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
