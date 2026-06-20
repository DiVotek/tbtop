<?php

namespace Tbtop\Admin\Dsl;

use Illuminate\Support\Str;
use JsonSerializable;

/**
 * Markdown display block.
 *
 * Converts markdown to HTML server-side via league/commonmark through
 * Illuminate\Support\Str::markdown(). Emits a `displayHtml` wire node so
 * the client needs no new handling.
 *
 * By default, embedded HTML tags in the markdown source are stripped and
 * unsafe links are neutralized. Call ->allowHtml() to pass raw HTML through.
 *
 * @method static self make(string $markdown)
 */
final class MarkdownBlock implements JsonSerializable
{
    private bool $allowHtmlValue = false;

    private function __construct(private readonly string $markdown) {}

    public static function make(string $markdown): self
    {
        return new self($markdown);
    }

    /**
     * Allow raw HTML in the markdown source to pass through unchanged.
     * Use only for trusted, author-controlled content.
     */
    public function allowHtml(): self
    {
        $clone = clone $this;
        $clone->allowHtmlValue = true;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $html = Str::markdown($this->markdown, [
            'html_input' => $this->allowHtmlValue ? 'allow' : 'strip',
            'allow_unsafe_links' => false,
        ]);

        return (new Node('displayHtml', ['html' => $html]))->jsonSerialize();
    }
}
