<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

/**
 * Static display text block.
 *
 * @method static self make(string $content)
 */
final class TextBlock implements JsonSerializable
{
    private string $variantValue = 'body';

    private function __construct(private readonly string $content) {}

    public static function make(string $content): self
    {
        return new self($content);
    }

    /** @param  'heading'|'subheading'|'body'|'muted'  $variant */
    public function variant(string $variant): self
    {
        $clone = clone $this;
        $clone->variantValue = $variant;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return [
            'kind' => 'displayText',
            'options' => ['content' => $this->content, 'variant' => $this->variantValue],
            'meta' => new stdClass,
        ];
    }
}
