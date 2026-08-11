<?php

namespace Tbtop\Admin\Dsl\Fields;

use Tbtop\Admin\Dsl\Concerns\HasAffixes;
use Tbtop\Admin\Dsl\Concerns\HasDatabaseRules;
use Tbtop\Admin\Dsl\Concerns\HasDependencies;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\RelationSearchLimit;

final class Relation extends Field
{
    use HasAffixes;
    use HasDatabaseRules;
    use HasDependencies;
    use HasServerQuery;

    /** Server-only — never serialized to the wire. */
    private ?int $searchLimit = null;

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

    /** Caps how many rows the search endpoint returns. Server-only — never serialized. */
    public function searchLimit(int $max): static
    {
        $this->searchLimit = $max;

        return $this;
    }

    public function getSearchLimit(): int
    {
        return RelationSearchLimit::resolve($this->searchLimit);
    }
}
