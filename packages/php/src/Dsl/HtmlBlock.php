<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;

/**
 * Raw HTML display block.
 *
 * Content is author-supplied from the DSL, not end-user input — no sanitization needed.
 *
 * @method static self make(string $rawHtml)
 */
final class HtmlBlock implements JsonSerializable
{
    private function __construct(private readonly string $rawHtml) {}

    public static function make(string $rawHtml): self
    {
        return new self($rawHtml);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return (new Node('displayHtml', ['html' => $this->rawHtml]))->jsonSerialize();
    }
}
