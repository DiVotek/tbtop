<?php

namespace Tbtop\Admin\Actions;

use JsonSerializable;

/**
 * Closed effect vocabulary executed by the client after an action, in the
 * order the builder methods were called.
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

    /**
     * Toast the message. Only 'error' and 'warning' have their own styling —
     * every other value, including an unrecognized one, renders as success.
     * Note the failure level is 'error', not 'danger' (which is the *button*
     * color vocabulary and would silently toast green here).
     */
    public function notify(string $message, string $kind = 'success'): self
    {
        return $this->push(['kind' => 'notify', 'message' => $message, 'level' => $kind]);
    }

    /** Client-side navigation via the Inertia router — not an HTTP redirect response from the controller. */
    public function redirect(string $href): self
    {
        return $this->push(['kind' => 'redirect', 'href' => $href]);
    }

    /**
     * Refetches the named table, or without a name: the table enclosing this
     * action if any, else every table mounted on the page, else a full page
     * reload if none are mounted.
     */
    public function refreshTable(?string $table = null): self
    {
        return $this->push(array_filter(['kind' => 'refreshTable', 'table' => $table]));
    }

    /** Resets the nearest enclosing form; the client ignores $form's value and always targets that form. */
    public function resetForm(?string $form = null): self
    {
        return $this->push(array_filter(['kind' => 'resetForm', 'form' => $form]));
    }

    /** Closes the modal the action ran in; a no-op outside a modal action. */
    public function closeModal(): self
    {
        return $this->push(['kind' => 'closeModal']);
    }

    /**
     * Replaces each key's value in the nearest enclosing form, leaving it
     * mounted and dirty. resetForm overwrites this — order setFormData last.
     *
     * @param  array<string, mixed>  $data
     */
    public function setFormData(array $data): self
    {
        return $this->push(['kind' => 'setFormData', 'data' => $data]);
    }

    /** Surfaces $message inside the still-open modal; does NOT close it. */
    public function haltModal(string $message, string $kind = 'error'): self
    {
        return $this->push(['kind' => 'haltModal', 'message' => $message, 'level' => $kind]);
    }

    /** Client writes $text to the clipboard and shows a success notify. */
    public function copyToClipboard(string $text): self
    {
        return $this->push(['kind' => 'copyToClipboard', 'text' => $text]);
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
