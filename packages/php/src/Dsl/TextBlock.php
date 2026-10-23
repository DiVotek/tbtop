<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\HasWhen;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;

/**
 * Static display text block.
 *
 * @method static self make(string $content)
 */
final class TextBlock implements JsonSerializable
{
    use HasWhen;
    use ResolvesClosures;

    private string|Closure $variantValue = 'body';

    private function __construct(private readonly string $content) {}

    public static function make(string $content): self
    {
        return new self($content);
    }

    /**
     * Typographic style applied to the rendered text.
     *
     * @param  'heading'|'subheading'|'body'|'muted'|(Closure(): ('heading'|'subheading'|'body'|'muted'))  $variant
     */
    public function variant(string|Closure $variant): self
    {
        $clone = clone $this;
        $clone->variantValue = self::typedDeferral($variant, 'string', 'TextBlock::variant');

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $options = ['content' => $this->content, 'variant' => $this->resolveOpt($this->variantValue)];

        return (new Node('displayText', $options))->jsonSerialize();
    }
}
