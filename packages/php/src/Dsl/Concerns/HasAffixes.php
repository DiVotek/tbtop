<?php

namespace Tbtop\Admin\Dsl\Concerns;

use JsonSerializable;
use Tbtop\Admin\Dsl\AffixNode;

trait HasAffixes
{
    /**
     * Content rendered before the input, inside the control (e.g. a currency
     * symbol or icon block). A plain string becomes a TextBlock; any other
     * JsonSerializable node is used as-is. Display nodes only — nesting a
     * Field here throws (an affix decorates the control, it is not a second
     * input, and its rules would never be collected).
     */
    public function prefix(string|JsonSerializable $content): static
    {
        return $this->setAffix('prefix', $content);
    }

    /** Content rendered after the input, inside the control. Same rules as prefix() — display nodes only, a nested Field throws. */
    public function suffix(string|JsonSerializable $content): static
    {
        return $this->setAffix('suffix', $content);
    }

    private function setAffix(string $key, string|JsonSerializable $content): static
    {
        $node = AffixNode::normalize("Field \"{$this->name}\"", $key, $content);
        if ($node === null) {
            unset($this->opts[$key]);

            return $this;
        }

        return $this->set($key, $node);
    }
}
