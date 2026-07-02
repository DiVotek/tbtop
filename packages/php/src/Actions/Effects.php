<?php

namespace Tbtop\Admin\Actions;

use JsonSerializable;

/**
 * Closed effect vocabulary executed by the client after an action.
 * Growing this set is a contract bump — prefer custom client handlers.
 */
final class Effects implements JsonSerializable
{
    /** @var list<array<string, mixed>> */
    private array $effects = [];

    public static function make(): self
    {
        return new self;
    }

    public function notify(string $message, string $kind = 'success'): self
    {
        return $this->push(['kind' => 'notify', 'message' => $message, 'level' => $kind]);
    }

    public function redirect(string $href): self
    {
        return $this->push(['kind' => 'redirect', 'href' => $href]);
    }

    public function refreshTable(?string $table = null): self
    {
        return $this->push(array_filter(['kind' => 'refreshTable', 'table' => $table]));
    }

    public function resetForm(?string $form = null): self
    {
        return $this->push(array_filter(['kind' => 'resetForm', 'form' => $form]));
    }

    public function closeModal(): self
    {
        return $this->push(['kind' => 'closeModal']);
    }

    /** Surfaces $message inside the still-open modal; does NOT close it. */
    public function haltModal(string $message, string $kind = 'error'): self
    {
        return $this->push(['kind' => 'haltModal', 'message' => $message, 'level' => $kind]);
    }

    /** @return list<array<string, mixed>> */
    public function jsonSerialize(): array
    {
        return $this->effects;
    }

    /** @param  array<string, mixed>  $effect */
    private function push(array $effect): self
    {
        $this->effects[] = $effect;

        return $this;
    }
}
