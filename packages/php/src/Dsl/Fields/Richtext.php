<?php

namespace Tbtop\Admin\Dsl\Fields;

use InvalidArgumentException;

final class Richtext extends Field
{
    /** @var list<Embed> */
    private array $embeds = [];

    private ?int $maxEmbeds = null;

    protected function kind(): string
    {
        return 'richtext';
    }

    /** Placeholder text shown in the empty editor. */
    public function placeholder(string $text): static
    {
        return $this->set('placeholder', $text);
    }

    /**
     * Block kinds the editor can insert as cards (slash menu "Blocks" group and
     * the toolbar "Block" button). Each embed's data is validated against its
     * fields on save, in every locale of a translatable field.
     *
     * @param  list<Embed>  $embeds
     */
    public function embeds(array $embeds): static
    {
        $kinds = [];
        foreach ($embeds as $embed) {
            if (isset($kinds[$embed->kind])) {
                throw new InvalidArgumentException("Richtext \"{$this->name}\": embed kind \"{$embed->kind}\" is declared twice.");
            }
            $kinds[$embed->kind] = true;
        }
        $this->embeds = $embeds;

        return $this->set('embeds', $this->embeds);
    }

    /** Server-side cap on embeds per document; a save with more fails on the field. No limit by default. */
    public function maxEmbeds(int $max): static
    {
        $this->maxEmbeds = $max;

        return $this;
    }

    /** @return list<Embed> */
    public function getEmbeds(): array
    {
        return $this->embeds;
    }

    public function getMaxEmbeds(): ?int
    {
        return $this->maxEmbeds;
    }

    /**
     * Every included field of every embed. Kept out of childFields(): rule,
     * default and translatable walkers must not treat them as the form's own.
     *
     * @return list<mixed>
     */
    public function embedFields(): array
    {
        $out = [];
        foreach ($this->embeds as $embed) {
            $out = [...$out, ...$embed->includedFields()];
        }

        return $out;
    }

    public function findEmbed(string $kind): ?Embed
    {
        foreach ($this->embeds as $embed) {
            if ($embed->kind === $kind) {
                return $embed;
            }
        }

        return null;
    }
}
