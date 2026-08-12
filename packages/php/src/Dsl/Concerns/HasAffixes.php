<?php

namespace Tbtop\Admin\Dsl\Concerns;

use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Node;
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
        $this->assertDisplayOnly([$node], $key);

        return $this->set($key, $node);
    }

    /**
     * An affix decorates the control; it is not a second input. A field nested
     * there renders but stays invisible to RuleWalker, which descends into
     * Node children only — its rules would silently never be collected.
     *
     * @param  list<mixed>  $nodes
     */
    private function assertDisplayOnly(array $nodes, string $key): void
    {
        foreach ($nodes as $node) {
            if ($node instanceof Field) {
                throw new InvalidArgumentException(
                    "Field \"{$this->name}\" {$key}() received field \"{$node->name}\" — affixes may contain display nodes only.",
                );
            }
            if ($node instanceof Node) {
                $this->assertDisplayOnly($node->nestedChildren(), $key);
            }
        }
    }
}
