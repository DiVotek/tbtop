<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use JsonSerializable;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Fluent table surface — DSL boundary, method count is the API.
 * The query closure stays server-side; the client fetches rows
 * from the page-scoped table endpoint.
 */
final class TableBuilder implements JsonSerializable
{
    /**
     * All column descriptors, including hidden ones (they need to participate
     * in projection decisions but not in wire serialization).
     *
     * @var list<Column>
     */
    private array $columnObjects = [];

    /** @var array<string, mixed> */
    private array $opts = [];

    /** @var list<string> — table-level searchable (back-compat) */
    private array $searchable = [];

    /** @var list<Field> */
    private array $filterFields = [];

    private ?string $filtersIn = null;

    private ?Closure $query = null;

    private int $paginatePerPage = 25;

    /** @var list<int> */
    private array $paginateOptions = [10, 25, 50, 100];

    public function __construct(public readonly string $name) {}

    /**
     * Accept Column instances, raw arrays, or shorthand ['name' => 'Label'].
     *
     * @param  array<int|string, mixed>  $columns
     */
    public function columns(array $columns): self
    {
        foreach ($columns as $key => $value) {
            if ($value instanceof Column) {
                $this->columnObjects[] = $value;
            } elseif (is_array($value)) {
                $this->columnObjects[] = self::columnFromArray($value);
            } else {
                // shorthand: 'name' => 'Label'
                $col = Column::make((string) $key)->label((string) $value)->kind('text');
                $this->columnObjects[] = $col;
            }
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
        $this->opts['searchable'] = $fields;

        return $this;
    }

    /**
     * Declare filter fields (same Field instances used in forms).
     * Serialized into options.filters as field nodes.
     * Also sets filtersIn to 'modal' if not already set.
     *
     * @param  list<Field>  $fields
     */
    public function filters(array $fields): self
    {
        $this->filterFields = $fields;
        if ($this->filtersIn === null) {
            $this->filtersIn = 'modal';
        }

        return $this;
    }

    /** @param  'modal'|'inline'  $mode */
    public function filtersIn(string $mode): self
    {
        $this->filtersIn = $mode;

        return $this;
    }

    /** @return list<Field> */
    public function filterFields(): array
    {
        return $this->filterFields;
    }

    public function defaultSort(string $field, string $dir = 'asc'): self
    {
        $this->opts['defaultSort'] = ['field' => $field, 'dir' => $dir];

        return $this;
    }

    /**
     * @deprecated Use paginate() for the unified pagination config.
     * Kept for back-compat; sets perPage on the pagination spec.
     */
    public function perPage(int $perPage): self
    {
        $this->paginatePerPage = $perPage;

        return $this;
    }

    /**
     * Configure pagination. Pagination is always active; this method just
     * customises the defaults.
     *
     * @param  list<int>  $options  Allowed perPage values shown in the UI.
     */
    public function paginate(int $perPage = 25, array $options = [10, 25, 50, 100]): self
    {
        $this->paginatePerPage = $perPage;
        $this->paginateOptions = $options;

        return $this;
    }

    /** @param  list<ActionBuilder>  $actions */
    public function rowActions(array $actions): self
    {
        $this->opts['rowActions'] = $actions;

        return $this;
    }

    /**
     * Set the row-click action: clicking a row triggers the named row action.
     * Interpolated client-side; must match a name in rowActions().
     */
    public function rowClick(string $actionName): self
    {
        $this->opts['rowClick'] = $actionName;

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

    /**
     * All searchable fields: table-level list + per-column searchable() columns.
     *
     * @return list<string>
     */
    public function searchableFields(): array
    {
        $fields = $this->searchable;
        foreach ($this->columnObjects as $col) {
            if ($col->isSearchable() && ! in_array($col->name, $fields, true)) {
                $fields[] = $col->name;
            }
        }

        return $fields;
    }

    /** @return list<string> Column names declared translatable */
    public function translatableColumns(): array
    {
        $names = [];
        foreach ($this->columnObjects as $col) {
            if ($col->isVisible() && $col->isTranslatable()) {
                $names[] = $col->name;
            }
        }

        return $names;
    }

    /**
     * All Column instances regardless of visibility — for projection pipeline.
     *
     * @return list<Column>
     */
    public function allColumns(): array
    {
        return $this->columnObjects;
    }

    /**
     * Visible Column instances only — for wire serialization.
     *
     * @return list<Column>
     */
    public function visibleColumns(): array
    {
        return array_values(array_filter($this->columnObjects, fn (Column $c) => $c->isVisible()));
    }

    /**
     * Names of columns that are explicitly declared sortable.
     * The default-sort field is always implicitly allowed.
     *
     * @return list<string>
     */
    public function sortableColumnNames(): array
    {
        $names = [];
        foreach ($this->columnObjects as $col) {
            if ($col->isSortable()) {
                $names[] = $col->name;
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

    /** @return array{perPage: int, options: list<int>} */
    public function paginationSpec(): array
    {
        return [
            'perPage' => $this->paginatePerPage,
            'options' => $this->paginateOptions,
        ];
    }

    public function toNode(): Node
    {
        $opts = $this->opts;
        if ($this->filterFields !== []) {
            $opts['filters'] = array_map(fn (Field $f) => $f->toNode(), $this->filterFields);
            $opts['filtersIn'] = $this->filtersIn ?? 'modal';
        }

        // Only serialize visible columns
        $columns = array_map(
            fn (Column $c) => $c->jsonSerialize(),
            $this->visibleColumns(),
        );

        // Pagination always present on wire
        $opts['pagination'] = $this->paginationSpec();

        return new Node('table', [
            ...$opts,
            'name' => $this->name,
            'columns' => $columns,
        ], $this->name);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return $this->toNode()->jsonSerialize();
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /**
     * Build a Column from a legacy raw array like
     * ['name' => 'title', 'label' => 'Title', 'kind' => 'text', 'translatable' => true].
     *
     * @param  array<string, mixed>  $raw
     */
    private static function columnFromArray(array $raw): Column
    {
        $col = Column::make((string) ($raw['name'] ?? ''));
        if (isset($raw['label'])) {
            $col->label((string) $raw['label']);
        }
        if (isset($raw['kind'])) {
            $col->kind((string) $raw['kind']);
        }
        if (($raw['translatable'] ?? false) === true) {
            $col->translatable();
        }
        if (($raw['sortable'] ?? false) === true) {
            $col->sortable();
        }
        if (($raw['searchable'] ?? false) === true) {
            $col->searchable();
        }

        return $col;
    }
}
