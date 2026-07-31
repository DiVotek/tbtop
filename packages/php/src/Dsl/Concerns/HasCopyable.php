<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

trait HasCopyable
{
    use ResolvesClosures;

    /** @var array{message: string|Closure, duration: int|Closure}|null */
    protected ?array $copyableDef = null;

    /**
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
