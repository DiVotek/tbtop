<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;

/**
 * Fluent table surface — DSL boundary, method count is the API.
 * The query closure stays server-side; the client fetches rows
 * from the page-scoped table endpoint.
 */
final class TableBuilder implements JsonSerializable
{
    /** @var list<array<string, mixed>> */
    private array $columns = [];

    /** @var array<string, mixed> */
    private array $opts = [];

    /** @var list<string> */
    private array $searchable = [];

    private ?Closure $query = null;

    public function __construct(public readonly string $name) {}

    /** @param  array<int|string, mixed>  $columns  ['title' => 'Title'] or [['name' => ..., 'label' => ..., 'kind' => ...]] */
    public function columns(array $columns): self
    {
        foreach ($columns as $key => $value) {
            $this->columns[] = is_array($value)
                ? $value
                : ['name' => (string) $key, 'label' => (string) $value, 'kind' => 'text'];
        }

        return $this;
    }

    public function query(Closure $query): self
    {
        $this->query = $query;

        return $this;
    }

    /** @param  list<string>  $fields */
    public function searchable(array $fields): self
    {
        $this->searchable = $fields;
        $this->opts['searchable'] = true;

        return $this;
    }

    public function defaultSort(string $field, string $dir = 'asc'): self
    {
        $this->opts['defaultSort'] = ['field' => $field, 'dir' => $dir];

        return $this;
    }

    public function perPage(int $perPage): self
    {
        $this->opts['perPage'] = $perPage;

        return $this;
    }

    /** @param  list<ActionBuilder>  $actions */
    public function rowActions(array $actions): self
    {
        $this->opts['rowActions'] = $actions;

        return $this;
    }

    /** @param  list<ActionBuilder>  $actions */
    public function bulkActions(array $actions): self
    {
        $this->opts['bulkActions'] = $actions;

        return $this;
    }

    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
    }

    public function queryClosure(): ?Closure
    {
        return $this->query;
    }

    /** @return list<string> */
    public function searchableFields(): array
    {
        return $this->searchable;
    }

    /** @return list<string> Column names declared translatable */
    public function translatableColumns(): array
    {
        $names = [];
        foreach ($this->columns as $column) {
            if (($column['translatable'] ?? false) === true) {
                $names[] = (string) $column['name'];
            }
        }

        return $names;
    }

    /** @return array{field: string, dir: string}|null */
    public function defaultSortSpec(): ?array
    {
        /** @var array{field: string, dir: string}|null */
        return $this->opts['defaultSort'] ?? null;
    }

    public function toNode(): Node
    {
        return new Node('table', [
            ...$this->opts,
            'name' => $this->name,
            'columns' => $this->columns,
        ], $this->name);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }
}
