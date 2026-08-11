<?php

namespace Tbtop\Admin\Dsl\Concerns;

use JsonSerializable;
use Tbtop\Admin\Dsl\S;
use Tbtop\Admin\Dsl\TextBlock;

trait HasAffixes
{
    public function prefix(string|JsonSerializable $content): static
    {
        return $this->setAffix('prefix', $content);
    }

    public function suffix(string|JsonSerializable $content): static
    {
        return $this->setAffix('suffix', $content);
    }

    private function setAffix(string $key, string|JsonSerializable $content): static
    {
        $node = S::normalizeChild(is_string($content) ? TextBlock::make($content) : $content);
        if ($node === null) {
            unset($this->opts[$key]);

            return $this;
        }

        return $this->set($key, $node);
    }
}
