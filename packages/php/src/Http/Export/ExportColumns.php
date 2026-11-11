<?php

namespace Tbtop\Admin\Http\Export;

use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\ColumnProjection;

/**
 * Which columns an export writes, and their cells for a chunk of rows. The
 * candidates are the table's visible value columns (a group contributes its
 * children); the request's columns[] picks among them, in declared order.
 */
final class ExportColumns
{
    /** @return list<Column> */
    public static function resolve(TableBuilder $table, Request $request): array
    {
        $candidates = self::candidates($table);
        $requested = $request->query('columns');
        if (! is_array($requested)) {
            $enabled = array_values(array_filter($candidates, static fn (Column $c): bool => $c->isExportEnabled()));

            return $enabled === [] ? $candidates : $enabled;
        }
        $names = array_filter($requested, 'is_string');
        $picked = array_values(array_filter($candidates, static fn (Column $c): bool => in_array($c->name, $names, true)));
        if ($picked === []) {
            throw new UnprocessableEntityHttpException('None of the requested columns can be exported.');
        }

        return $picked;
    }

    /**
     * @param  list<Column>  $columns
     * @return list<string>
     */
    public static function headers(array $columns): array
    {
        return array_map(static fn (Column $c): string => $c->getExportLabel(), $columns);
    }

    /**
     * One list of cells per row: the export(as:) override when set, else the
     * value the table projects for the screen.
     *
     * @param  list<Column>  $columns
     * @param  iterable<int, mixed>  $rows
     * @return list<list<string|int|float>>
     */
    public static function cells(TableBuilder $table, array $columns, iterable $rows): array
    {
        $rows = is_array($rows) ? array_values($rows) : iterator_to_array($rows, false);
        $projected = ColumnProjection::apply($table, $rows);
        $out = [];
        foreach ($rows as $i => $row) {
            $line = [];
            foreach ($columns as $column) {
                $line[] = ExportCell::value($column, self::value($column, $row, $projected[$i]));
            }
            $out[] = $line;
        }

        return $out;
    }

    private static function value(Column $column, mixed $row, mixed $projected): mixed
    {
        $as = $column->exportClosure();
        if ($as !== null) {
            return $as(data_get($row, $column->name), $row);
        }
        if (is_array($projected) && array_key_exists($column->name, $projected)) {
            return $projected[$column->name];
        }

        return data_get($projected, $column->name);
    }

    /** @return list<Column> */
    private static function candidates(TableBuilder $table): array
    {
        $out = [];
        foreach ($table->visibleColumns() as $column) {
            $children = $column->groupColumns();
            foreach ($children === [] ? [$column] : $children as $leaf) {
                $out[] = $leaf;
            }
        }

        return $out;
    }
}
