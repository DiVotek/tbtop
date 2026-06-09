<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;

final class FormBuilder implements JsonSerializable
{
    /** @var list<mixed> */
    private array $children = [];

    /** @var array<string, mixed> */
    private array $record = [];

    private ?Closure $onSubmit = null;

    /** @param  list<mixed>  $children Nodes and builders. */
    public function __construct(public readonly string $name, array $children = [])
    {
        $this->children = $children;
    }

    /** @param  array<string, mixed>  $record Initial form data, lands in page props. */
    public function record(array $record): self
    {
        $this->record = $record;

        return $this;
    }

    public function onSubmit(Closure $handler): self
    {
        $this->onSubmit = $handler;

        return $this;
    }

    public function submitHandler(): ?Closure
    {
        return $this->onSubmit;
    }

    /** @return array<string, mixed> */
    public function recordData(): array
    {
        return $this->record;
    }

    /** Laravel validation rules collected from descendant fields. @return array<string, list<string>> */
    public function collectRules(): array
    {
        return RuleWalker::collect($this->children);
    }

    public function toNode(): Node
    {
        return new Node('form', ['name' => $this->name, 'children' => $this->children], $this->name);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
