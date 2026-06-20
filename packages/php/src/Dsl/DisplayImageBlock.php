<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

/**
 * Read-only full-size image or file-download link.
 *
 * The author passes a URL they already hold — no signed-URL resolution
 * (that's the upload field's job). Default renders a full-size <img>; call
 * ->asLink() to render a file-download anchor instead.
 *
 * @method static self make(string $src)
 */
final class DisplayImageBlock implements JsonSerializable
{
    private ?string $altValue = null;

    private ?string $captionValue = null;

    private bool $asLinkValue = false;

    private function __construct(private readonly string $src) {}

    public static function make(string $src): self
    {
        return new self($src);
    }

    public function alt(string $alt): self
    {
        $clone = clone $this;
        $clone->altValue = $alt;

        return $clone;
    }

    public function caption(string $caption): self
    {
        $clone = clone $this;
        $clone->captionValue = $caption;

        return $clone;
    }

    /** Render as a file-download link instead of an inline image. */
    public function asLink(): self
    {
        $clone = clone $this;
        $clone->asLinkValue = true;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $options = ['src' => $this->src];
        if ($this->altValue !== null) {
            $options['alt'] = $this->altValue;
        }
        if ($this->captionValue !== null) {
            $options['caption'] = $this->captionValue;
        }
        if ($this->asLinkValue) {
            $options['asLink'] = true;
        }

        return ['kind' => 'displayImage', 'options' => $options, 'meta' => new stdClass];
    }
}
