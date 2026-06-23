<?php

namespace Tbtop\Admin\Dsl\Concerns;

trait HasTooltip
{
    protected ?string $tooltipText = null;

    public function tooltip(string $text): static
    {
        $this->tooltipText = $text;

        return $this;
    }

    /** @return array<string, mixed> */
    protected function tooltipOption(): array
    {
        return $this->tooltipText !== null ? ['tooltip' => $this->tooltipText] : [];
    }
}
