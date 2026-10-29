<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Tbtop\Admin\Dsl\Concerns\HasWhen;

/**
 * HTML display block.
 *
 * Sanitized server-side by default (symfony/html-sanitizer, W3C safe
 * baseline): scripts, event handlers, iframes and javascript: URLs are
 * dropped (and so are style, data-* and inline SVG; class stays), so the
 * content may come from a record. Call ->trusted() to emit
 * the HTML unchanged when the author controls every byte of it.
 *
 * @method static self make(string $html)
 */
final class HtmlBlock implements JsonSerializable
{
    use HasWhen;

    private bool $trustedValue = false;

    private function __construct(private readonly string $html) {}

    public static function make(string $html): self
    {
        return new self($html);
    }

    /**
     * Skip sanitization and emit the HTML as given. Use only for
     * author-controlled markup; the author owns escaping.
     */
    public function trusted(): self
    {
        $clone = clone $this;
        $clone->trustedValue = true;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $html = $this->trustedValue ? $this->html : self::sanitizer()->sanitize($this->html);

        return (new Node('displayHtml', ['html' => $html]))->jsonSerialize();
    }

    private static function sanitizer(): HtmlSanitizer
    {
        static $sanitizer = null;

        return $sanitizer ??= new HtmlSanitizer(
            (new HtmlSanitizerConfig)
                ->allowSafeElements()
                ->allowAttribute('class', '*')
                ->allowLinkSchemes(['http', 'https', 'mailto', 'tel'])
                ->allowRelativeLinks()
                ->allowRelativeMedias()
                ->withMaxInputLength(-1),
        );
    }
}
