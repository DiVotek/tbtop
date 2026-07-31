<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Concerns\ResolvesClosures;

/**
 * Alert display block.
 *
 * @method static self make(string $message)
 */
final class AlertBlock implements JsonSerializable
{
    use ResolvesClosures;

    private string|Closure|null $titleValue = null;

    private string|Color|Closure $colorValue = 'info';

    private function __construct(private readonly string $message) {}

    public static function make(string $message): self
    {
        return new self($message);
    }

    /** @param  string|(Closure(): string)|null  $title */
    public function title(string|Closure|null $title): self
    {
        $clone = clone $this;
        $clone->titleValue = $title;

        return $clone;
    }

    /** @param  Color|string|(Closure(): (Color|string))  $color */
    public function color(Color|string|Closure $color): self
    {
        $clone = clone $this;
        $clone->colorValue = $color;

        return $clone;
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $color = $this->resolveOpt($this->colorValue);
        $options = [
            'message' => $this->message,
            'color' => $color instanceof Color ? $color->value : $color,
        ];
        $title = $this->resolveOpt($this->titleValue);
        if ($title !== null) {
            $options['title'] = $title;
        }

        return (new Node('displayAlert', $options))->jsonSerialize();
    }
}
