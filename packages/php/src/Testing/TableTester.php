<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;

/**
 * A page table. search(), filter(), sort(), tab() and page() collect the
 * query the client would send; the rows are fetched from the table endpoint
 * on the first assertion after a change. Rows are matched by record key, so
 * models, keys and rows all work wherever a record is expected.
 */
final class TableTester
{
    /** @var array<string, mixed> */
    private array $query = [];

    private ?TestResponse $response = null;

    /** @param  array<string, mixed>  $node */
    public function __construct(
        private readonly PageVisit $visit,
        private readonly string $name,
        private readonly array $node,
    ) {}

    /** The last table fetch's raw response. */
    public function response(): TestResponse
    {
        return $this->fetch();
    }

    /** The table endpoint refused the fetch: 403 from the page gate. */
    public function assertForbidden(): self
    {
        $this->fetch()->assertForbidden();

        return $this;
    }

    /** Table-wide search over the searchable columns. */
    public function search(string $text): self
    {
        $columns = array_filter($this->options()['columns'] ?? [], static fn (mixed $c): bool => is_array($c) && ($c['searchable'] ?? false) === true);
        Assert::assertTrue($this->blind() || ! empty($this->options()['searchable']) || $columns !== [], "Table [{$this->name}] is not searchable.");

        return $this->with('search', $text);
    }

    /** One column's own search box. */
    public function searchColumn(string $column, string $text): self
    {
        $this->column($column);

        return $this->with("colSearch.{$column}", $text);
    }

    /** Set a declared filter, as the filter bar or modal would. */
    public function filter(string $name, mixed $value): self
    {
        $filters = Wire::nodes([$this->options()['filters'] ?? []]);
        $names = array_map(static fn (array $e): mixed => $e['node']['name'] ?? null, $filters);
        if (! $this->blind() && ! in_array($name, $names, true)) {
            Assert::fail("Table [{$this->name}] has no filter [{$name}]. Filters: ".Wire::nameList($filters).'.');
        }

        return $this->with("filters.{$name}", $value);
    }

    /** Sort by a visible column, as a header click does. */
    public function sort(string $column, string $direction = 'asc'): self
    {
        $this->column($column);
        $sortable = array_filter($this->options()['columns'] ?? [], static fn (mixed $c): bool => is_array($c) && ($c['name'] ?? null) === $column && ($c['sortable'] ?? false) === true);
        if (! $this->blind() && $sortable === [] && ($this->options()['defaultSort']['field'] ?? null) !== $column) {
            Assert::fail("Column [{$column}] of table [{$this->name}] is not sortable: the server would ignore the sort.");
        }

        return $this->with('sort', $column)->with('dir', $direction);
    }

    /** Switch to a declared filter tab. */
    public function tab(string $name): self
    {
        $tabs = array_column($this->options()['tabs'] ?? [], 'name');
        if (! $this->blind() && ! in_array($name, $tabs, true)) {
            Assert::fail("Table [{$this->name}] has no tab [{$name}]. Tabs: ".($tabs === [] ? 'none' : implode(', ', $tabs)).'.');
        }

        return $this->with('tab', $name);
    }

    /** Go to a page of rows. */
    public function page(int $page): self
    {
        return $this->with('page', $page);
    }

    /** Pick a page size; the server falls back to the default for one the table does not offer. */
    public function perPage(int $perPage): self
    {
        return $this->with('perPage', $perPage);
    }

    /** The column ships to the client: declared, and kept by when() and visibility checks. */
    public function assertColumnVisible(string $name): self
    {
        $this->column($name);

        return $this;
    }

    /** The column is off the wire: hidden(), visible() or never declared. */
    public function assertColumnHidden(string $name): self
    {
        Assert::assertNotContains($name, $this->columnNames(), "Column [{$name}] is visible.");

        return $this;
    }

    /**
     * These records are on the current page of rows — in this order with $inOrder.
     *
     * @param  iterable<mixed>|Model|int|string  $records
     */
    public function assertCanSeeRecords(iterable|Model|int|string $records, bool $inOrder = false): self
    {
        $keys = array_map(strval(...), Records::keys($records));
        $seen = array_map(strval(...), $this->keys());
        Assert::assertSame([], array_values(array_diff($keys, $seen)), "Table [{$this->name}] does not show these records. Shown keys: ".json_encode($seen));
        if ($inOrder) {
            Assert::assertSame($keys, array_values(array_intersect($seen, $keys)), "Table [{$this->name}] shows the records in another order: ".json_encode($seen));
        }

        return $this;
    }

    /**
     * None of these records are on the current page of rows.
     *
     * @param  iterable<mixed>|Model|int|string  $records
     */
    public function assertCanNotSeeRecords(iterable|Model|int|string $records): self
    {
        $keys = array_map(strval(...), Records::keys($records));
        $shown = array_values(array_intersect($keys, array_map(strval(...), $this->keys())));
        Assert::assertSame([], $shown, "Table [{$this->name}] shows records it should not: ".json_encode($shown));

        return $this;
    }

    /** Rows on the current page. */
    public function assertCountRecords(int $count): self
    {
        Assert::assertCount($count, $this->rows(), "Table [{$this->name}] shows a different number of rows.");

        return $this;
    }

    /** The total across all pages. A simplePagination() table has none: use assertCountRecords(). */
    public function assertTotal(int $total): self
    {
        $data = $this->data();
        Assert::assertArrayHasKey('total', $data, "Table [{$this->name}] uses simplePagination() and reports no total.");
        Assert::assertSame($total, $data['total'], "Table [{$this->name}] has a different total.");

        return $this;
    }

    /** A count-enabled tab's badge number. */
    public function assertTabCount(string $tab, int $count): self
    {
        Assert::assertSame($count, $this->data()['tabCounts'][$tab] ?? null, "Tab [{$tab}] has a different count.");

        return $this;
    }

    /** One cell as the server formatted it for the client. */
    public function assertCell(mixed $record, string $column, mixed $value): self
    {
        $this->column(explode('.', $column)[0]);
        $row = $this->row($record);
        Assert::assertTrue($value === null || Arr::has($row, $column), "Cell [{$column}] of record [".Records::key($record).'] is missing.');
        Assert::assertEquals($value, data_get($row, $column), "Cell [{$column}] of record [".Records::key($record).'] differs.');

        return $this;
    }

    /**
     * Run a row action on a record, sending its row as the table shows it.
     * The record must be on the current page.
     *
     * @param  array<string, mixed>  $form  values for a modal action's form
     */
    public function callRowAction(string $name, mixed $record, array $form = []): Result
    {
        return $this->refreshed($this->visit->run($this->visit->action($name, $this->node), $form, $this->row($record), []));
    }

    /** Open a row's modal action: its query() runs with that row. */
    public function openRowAction(string $name, mixed $record): ModalTester
    {
        return $this->visit->open($this->visit->action($name, $this->node)['node'], $this->row($record), []);
    }

    /**
     * Run a bulk action on the selected records.
     *
     * @param  iterable<mixed>|Model|int|string  $records
     * @param  array<string, mixed>  $form  values for a modal action's form
     */
    public function callBulkAction(string $name, iterable|Model|int|string $records, array $form = []): Result
    {
        return $this->refreshed($this->visit->run($this->visit->action($name, $this->node), $form, [], Records::keys($records)));
    }

    /**
     * Run one of the table's header actions.
     *
     * @param  array<string, mixed>  $form
     */
    public function callAction(string $name, array $form = []): Result
    {
        return $this->refreshed($this->visit->run($this->visit->action($name, $this->node), $form, [], []));
    }

    /**
     * The current page of rows, as the client receives them.
     *
     * @return list<array<string, mixed>>
     */
    public function rows(): array
    {
        $rows = $this->data()['data'] ?? [];

        return is_array($rows) ? array_values($rows) : [];
    }

    /** An action may change the rows: the next assertion fetches them again. */
    private function refreshed(Result $result): Result
    {
        $this->response = null;

        return $result;
    }

    private function with(string $key, mixed $value): self
    {
        data_set($this->query, $key, $value);
        $this->response = null;

        return $this;
    }

    private function fetch(): TestResponse
    {
        return $this->response ??= $this->visit->http->fetch($this->visit->endpoint('table', $this->name), $this->query);
    }

    /** @return array<string, mixed> */
    private function data(): array
    {
        $response = $this->fetch();
        $status = $response->getStatusCode();
        Assert::assertSame(200, $status, "Table [{$this->name}] responded {$status}: ".$response->getContent());
        $data = $response->json('data');

        return is_array($data) ? $data : [];
    }

    /** @return list<int|string> */
    private function keys(): array
    {
        return array_map(static fn (array $row): int|string => Records::key($row), $this->rows());
    }

    /** @return array<string, mixed> */
    private function row(mixed $record): array
    {
        if ($this->fetch()->getStatusCode() !== 200) {
            return ['_key' => Records::key($record)];
        }
        $key = (string) Records::key($record);
        foreach ($this->rows() as $row) {
            if ((string) Records::key($row) === $key) {
                return $row;
            }
        }
        Assert::fail("Record [{$key}] is not on the current page of table [{$this->name}]. Shown keys: ".json_encode($this->keys()));
    }

    private function column(string $name): void
    {
        if (! $this->blind() && ! in_array($name, $this->columnNames(), true)) {
            Assert::fail("Table [{$this->name}] has no visible column [{$name}]. Columns: ".implode(', ', $this->columnNames()).'.');
        }
    }

    /** @return list<string> */
    private function columnNames(): array
    {
        return array_values(array_filter(array_map(
            static fn (mixed $c): mixed => is_array($c) ? $c['name'] ?? null : null,
            $this->options()['columns'] ?? [],
        ), 'is_string'));
    }

    /** @return array<string, mixed> */
    /** The page did not render, so the table's declarations are unknown: the query goes out unchecked. */
    private function blind(): bool
    {
        return $this->visit->response->getStatusCode() !== 200;
    }

    private function options(): array
    {
        return $this->node['options'] ?? [];
    }
}
