<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;

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
    use ResolvesClosures;

    private string|Closure|null $altValue = null;

    private string|Closure|null $captionValue = null;

    private bool $asLinkValue = false;

    private ?string $shapeValue = null;

    private function __construct(private readonly string $src) {}

    public static function make(string $src): self
    {
        return new self($src);
    }

    /** @param  string|(Closure(): string)  $alt */
    public function alt(string|Closure $alt): self
    {
        $clone = clone $this;
        $clone->altValue = $alt;

        return $clone;
    }

    /** @param  string|(Closure(): string)  $caption */
    public function caption(string|Closure $caption): self
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

    /** Square image shape (sharp corners). Last shape call wins. */
    public function square(): self
    {
        $clone = clone $this;
        $clone->shapeValue = 'square';

        return $clone;
    }

    /** Circular image shape. Last shape call wins. */
    public function circular(): self
    {
        $clone = clone $this;
        $clone->shapeValue = 'circular';

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $options = ['src' => $this->src];
        $alt = $this->resolveOpt($this->altValue);
        if ($alt !== null) {
            $options['alt'] = $alt;
        }
        $caption = $this->resolveOpt($this->captionValue);
        if ($caption !== null) {
            $options['caption'] = $caption;
        }
        if ($this->asLinkValue) {
            $options['asLink'] = true;
        }
        if ($this->shapeValue !== null) {
            $options['shape'] = $this->shapeValue;
        }

        return (new Node('displayImage', $options))->jsonSerialize();
    }
}
