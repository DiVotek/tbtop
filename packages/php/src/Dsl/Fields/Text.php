<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasLocalePlaceholder;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Text extends Field
{
    use HasAffixes;
    use HasDatabaseRules;
    use HasLocalePlaceholder;
    use HasStringRules;

    protected function kind(): string
    {
        return 'text';
    }

    /**
     * Static input mask, Filament token alphabet: `9` = digit, `a` = letter,
     * `*` = alphanumeric; any other character is a literal that the client
     * inserts automatically (e.g. '(999) 999-9999'). No support for optional
     * or repeating tokens — it's a fixed-length pattern only.
     */
    public function mask(string $pattern): static
    {
        return $this->set('mask', $pattern);
    }
}
