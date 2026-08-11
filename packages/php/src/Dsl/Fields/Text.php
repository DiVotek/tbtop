<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;

final class Text extends Field
{
    use HasAffixes;
    use HasDatabaseRules;
    use HasStringRules;

    protected function kind(): string
    {
        return 'text';
    }

    public function mask(string $pattern): static
    {
        return $this->set('mask', $pattern);
    }

    public function placeholder(string $text): static
    {
        return $this->set('placeholder', $text);
    }
}
