<?php

namespace Tbtop\Admin\Dsl\Actions;

use InvalidArgumentException;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\ExportFormat;
use Tbtop\Admin\Dsl\S;

/**
 * Prebuilt table export: a header or bulk action that opens a column picker
 * and downloads the table's rows — current filters, search and sort applied,
 * the selection when there is one — as CSV or XLSX. Values match the screen;
 * Column::export() renames a header, overrides a value or unticks a column.
 * Gate it with ->authorize() like any action.
 */
final class ExportAction
{
    /** The client handler the export dialog registers under. */
    public const HANDLER = 'tbtop.export';

    public const DEFAULT_MAX_ROWS = 50_000;

    /**
     * @param  list<ExportFormat>  $formats  Offered formats, the first preselected.
     * @param  string|null  $filename  File name without extension; defaults to the table name and date.
     * @param  int  $maxRows  A larger export is refused with a message to narrow it.
     */
    public static function make(
        S $s,
        array $formats = [ExportFormat::Csv, ExportFormat::Xlsx],
        ?string $filename = null,
        int $maxRows = self::DEFAULT_MAX_ROWS,
        string $name = 'export',
    ): ActionBuilder {
        if ($formats === []) {
            throw new InvalidArgumentException('ExportAction needs at least one format.');
        }
        if ($maxRows < 1) {
            throw new InvalidArgumentException('ExportAction maxRows must be at least 1.');
        }
        $params = [
            'formats' => array_map(static fn (ExportFormat $f): string => $f->value, $formats),
            'maxRows' => $maxRows,
        ];
        if ($filename !== null) {
            $params['filename'] = $filename;
        }

        return $s->action($name)
            ->label(__('tbtop-admin::admin.action.export'))
            ->custom(self::HANDLER, $params);
    }
}
