<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

trait HasCopyable
{
    use ResolvesClosures;

    /** @var array{message: string|Closure, duration: int|Closure}|null */
    protected ?array $copyableDef = null;

    /**
     * Renders a copy-to-clipboard button next to the value.
     *
     * What lands on the clipboard is whatever reached the client, which is not
     * always the stored value: server-formatted kinds (money/date/datetime/
     * number) and formatUsing() bake their output into the wire, so a money
     * column copies "12.34 USD", not the cents. Kinds the client renders
     * (badge/boolean/icon) and form fields copy the raw value.
     *
     * @param  string|(Closure(): string)  $copyMessage
     * @param  int|(Closure(): int)  $copyMessageDuration
     */
    public function copyable(string|Closure $copyMessage = 'Copied', int|Closure $copyMessageDuration = 2000): static
    {
        $this->copyableDef = ['message' => $copyMessage, 'duration' => $copyMessageDuration];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function copyableOption(): array
    {
        if ($this->copyableDef === null) {
            return [];
        }

        return ['copyable' => [
            'message' => $this->resolveOpt($this->copyableDef['message']),
            'duration' => $this->resolveOpt($this->copyableDef['duration']),
        ]];
    }
}
