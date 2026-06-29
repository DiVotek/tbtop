<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasDependencies;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;

final class Relation extends Field
{
    use HasDatabaseRules;
    use HasDependencies;
    use HasServerQuery;

    protected function kind(): string
    {
        return 'relation';
    }

    public function searchable(bool $value = true): static
    {
        return $this->set('searchable', $value);
    }

    /** Column name used as the display label in the relation picker. */
    public function labelKey(string $column): static
    {
        return $this->set('labelKey', $column);
    }

    /** Returns the label column name (defaults to 'name' when not set). */
    public function getLabelKey(): string
    {
        return (string) ($this->opts['labelKey'] ?? 'name');
    }
}
