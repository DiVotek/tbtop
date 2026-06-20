<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;

/**
 * Read-only render of a stored Lexical SerializedEditorState.
 *
 * The author passes the editor-state map the richtext field produced; the
 * client mounts a read-only Lexical composer to render it.
 *
 * @method static self make(array $state)
 */
final class DisplayRichtextBlock implements JsonSerializable
{
    /** @param  array<string, mixed>  $state */
    private function __construct(private readonly array $state) {}

    /** @param  array<string, mixed>  $state */
    public static function make(array $state): self
    {
        return new self($state);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return (new Node('displayRichtext', ['state' => $this->state]))->jsonSerialize();
    }
}
