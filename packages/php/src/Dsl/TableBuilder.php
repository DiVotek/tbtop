<?php

namespace Tbtop\Admin\Dsl;

use Closure;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\Actions\ForceDeleteAction;
use Tbtop\Admin\Dsl\Actions\RestoreAction;
use Tbtop\Admin\Dsl\Concerns\HasServerQuery;
use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Fluent table surface — DSL boundary, method count is the API.
 * The query closure stays server-side; the client fetches rows
 * from the page-scoped table endpoint.
 */
final class TableBuilder implements JsonSerializable
{
    use HasServerQuery;

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

    /** @var list<Tab> */
    private array $tabObjects = [];

    private ?string $filtersIn = null;

    private ?Closure $recordUrlResolver = null;

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

        foreach ($this->columnObjects as $col) {
            if ($col->isEditable() && $col->onSaveClosure() === null) {
                throw new InvalidArgumentException(
                    "Editable column \"{$col->name}\" requires ->onSave() to be set."
                );
            }
        }

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

    /**
     * Declare predefined filter tabs. Tab names must be unique per table;
     * the first declared tab is the default when no tab param is sent.
     *
     * @param  list<Tab>  $tabs
     */
    public function tabs(array $tabs): self
    {
        $seen = [];
        foreach ($tabs as $tab) {
            if (isset($seen[$tab->name])) {
                throw new InvalidArgumentException(
                    "Duplicate tab name \"{$tab->name}\" on table \"{$this->name}\"."
                );
            }
            $seen[$tab->name] = true;
        }
        $this->tabObjects = $tabs;

        return $this;
    }

    /** @return list<Tab> */
    public function tabObjects(): array
    {
        return $this->tabObjects;
    }

    public function findTab(string $name): ?Tab
    {
        foreach ($this->tabObjects as $tab) {
            if ($tab->name === $name) {
                return $tab;
            }
        }

        return null;
    }

    /** First declared tab — the default when the request carries no tab param. */
    public function defaultTab(): ?Tab
    {
        return $this->tabObjects[0] ?? null;
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

    /** @param  list<ActionBuilder|Node>  $actions — plain actions render inline; wrap in S::dropdown()/actionGroup() to collapse into a menu. */
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

    /** Placeholder text for the search input (defaults to a generic i18n string). */
    public function searchPlaceholder(string $text): self
    {
        $this->opts['searchPlaceholder'] = $text;

        return $this;
    }

    /** Customize the empty-table message. $icon is a registered client icon name. */
    public function emptyState(string $heading, ?string $description = null, ?string $icon = null): self
    {
        $this->opts['emptyState'] = array_filter(
            ['heading' => $heading, 'description' => $description, 'icon' => $icon],
            fn ($v) => $v !== null,
        );

        return $this;
    }

    /**
     * Actions rendered above the table (e.g. a Create button).
     *
     * @param  list<ActionBuilder|Node>  $actions
     */
    public function headerActions(array $actions): self
    {
        $this->opts['headerActions'] = $actions;

        return $this;
    }

    /**
     * Make each row a link. The resolver runs server-side per row and returns a
     * URL; the client navigates there on row click. The closure never serializes.
     */
    public function recordUrl(Closure $resolver): self
    {
        $this->recordUrlResolver = $resolver;
        $this->opts['recordUrl'] = true;

        return $this;
    }

    /** Open the record URL in a new browser tab. */
    public function openRecordUrlInNewTab(bool $newTab = true): self
    {
        $this->opts['recordUrlNewTab'] = $newTab;

        return $this;
    }

    public function recordUrlResolver(): ?Closure
    {
        return $this->recordUrlResolver;
    }

    /**
     * Enable drag-and-drop row reordering, persisting order to $column.
     * The reorder column becomes the default sort so the persisted order
     * survives a reload — an explicit defaultSort() set earlier still wins.
     */
    public function reorderable(string $column = 'sort_order'): self
    {
        $this->opts['reorder'] = ['column' => $column];
        $this->opts['defaultSort'] ??= ['field' => $column, 'dir' => 'asc'];

        return $this;
    }

    /** Reorder column when reordering is enabled, else null. */
    public function reorderColumn(): ?string
    {
        return $this->opts['reorder']['column'] ?? null;
    }

    /** @param  list<ActionBuilder>  $actions */
    public function bulkActions(array $actions): self
    {
        $this->opts['bulkActions'] = $actions;

        return $this;
    }

    /**
     * Soft-delete convenience layer over existing primitives: prepends
     * active/trashed/all tabs and appends restore/forceDelete row + bulk
     * actions. Each part opts out via $options. Everything MERGES with config
     * already set, so call this AFTER your own tabs()/rowActions()/bulkActions().
     *
     * The active tab lands first so it is the default; the global SoftDeletes
     * scope hides trashed rows until the consumer switches tabs.
     *
     * @param  class-string  $model  A model using the SoftDeletes trait.
     * @param  array{rowActions?: bool, bulkActions?: bool, tabs?: bool}  $options
     */
    public function softDeletes(S $s, string $model, array $options = []): self
    {
        $opts = [...['rowActions' => true, 'bulkActions' => true, 'tabs' => true], ...$options];

        if ($opts['tabs']) {
            $this->tabs([...self::trashedTabs(), ...$this->tabObjects]);
        }
        if ($opts['rowActions']) {
            $existing = $this->opts['rowActions'] ?? [];
            $this->opts['rowActions'] = [...$existing, RestoreAction::make($s, $model), ForceDeleteAction::make($s, $model)];
        }
        if ($opts['bulkActions']) {
            $existing = $this->opts['bulkActions'] ?? [];
            $this->opts['bulkActions'] = [...$existing, RestoreAction::bulk($s, $model), ForceDeleteAction::bulk($s, $model)];
        }

        return $this;
    }

    public function set(string $key, mixed $value): self
    {
        $this->opts[$key] = $value;

        return $this;
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
        if ($this->tabObjects !== []) {
            // Closures never serialize — only name/label/count go on the wire.
            $opts['tabs'] = array_map(fn (Tab $t) => $t->toWire(), $this->tabObjects);
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

    /**
     * The three soft-delete tabs, active first. Active carries an identity
     * closure: the global SoftDeletes scope already hides trashed rows.
     *
     * @return list<Tab>
     */
    private static function trashedTabs(): array
    {
        return [
            Tab::make('active')->label('Active')->query(fn ($q) => $q),
            Tab::make('trashed')->label('Trashed')->query(fn ($q) => $q->onlyTrashed()),
            Tab::make('withTrashed')->label('All')->query(fn ($q) => $q->withTrashed()),
        ];
    }
}
