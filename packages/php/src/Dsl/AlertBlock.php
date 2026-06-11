<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

/**
 * Alert display block.
 *
 * @method static self make(string $message)
 */
final class AlertBlock implements JsonSerializable
{
    private ?string $titleValue = null;

    private string $colorValue = 'info';

    private function __construct(private readonly string $message) {}

    public static function make(string $message): self
    {
        return new self($message);
    }

    public function title(?string $title): self
    {
        $clone = clone $this;
        $clone->titleValue = $title;

        return $clone;
    }

    public function color(Color|string $color): self
    {
        $clone = clone $this;
        $clone->colorValue = $color instanceof Color ? $color->value : $color;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $options = ['message' => $this->message, 'color' => $this->colorValue];
        if ($this->titleValue !== null) {
            $options['title'] = $this->titleValue;
        }

        return [
            'kind' => 'displayAlert',
            'options' => $options,
            'meta' => new stdClass,
        ];
    }
}
