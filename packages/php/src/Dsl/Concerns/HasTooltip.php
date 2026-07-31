<?php

namespace Tbtop\Admin\Dsl\Concerns;

use Closure;

trait HasTooltip
{
    use ResolvesClosures;

    protected string|Closure|null $tooltipText = null;

    /** @param  string|(Closure(): string)  $text */
    public function tooltip(string|Closure $text): static
    {
        $this->tooltipText = $text;

        return $this;
    }

    /** @return array<string, mixed> */
    protected function tooltipOption(): array
    {
        return $this->tooltipText !== null ? ['tooltip' => $this->resolveOpt($this->tooltipText)] : [];
    }
}
