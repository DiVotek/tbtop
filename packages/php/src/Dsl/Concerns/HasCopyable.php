<?php

namespace Tbtop\Admin\Dsl\Concerns;

trait HasCopyable
{
    /** @var array{message: string, duration: int}|null */
    protected ?array $copyableDef = null;

    public function copyable(string $copyMessage = 'Copied', int $copyMessageDuration = 2000): static
    {
        $this->copyableDef = ['message' => $copyMessage, 'duration' => $copyMessageDuration];

        return $this;
    }

    /** @return array<string, mixed> */
    protected function copyableOption(): array
    {
        return $this->copyableDef !== null ? ['copyable' => $this->copyableDef] : [];
    }
}
