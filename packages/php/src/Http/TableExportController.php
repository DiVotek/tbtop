<?php

namespace Tbtop\Admin\Http;

use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Eloquent\Builder as ModelBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Tbtop\Admin\Dsl\ActionBuilder;
use Tbtop\Admin\Dsl\Actions\ExportAction;
use Tbtop\Admin\Dsl\ExportFormat;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\Export\CsvWriter;
use Tbtop\Admin\Http\Export\ExportColumns;
use Tbtop\Admin\Http\Export\ExportWriter;
use Tbtop\Admin\Http\Export\XlsxWriter;

/**
 * GET {page-path}/tables/{tbtopTable}/export/{tbtopAction}
 *
 * Streams the table's rows as a file for an ExportAction placed in that
 * table's header or bulk actions: the request carries the table state
 * (tab, search, filters, sort), optional ids[] for a selection and the
 * columns[] picked in the dialog. Rows are counted first, so a too-large
 * export is refused before a byte of the file is sent.
 */
final class TableExportController
{
    use AuthorizesPage;

    private const CHUNK = 500;

    public function __invoke(Request $request): StreamedResponse
    {
        $this->authorizePageGate($request);

        $resolved = ResolvedPage::fromRequest($request);
        $tableName = (string) $request->route('tbtopTable');
        $table = $resolved->s->reachableTable($tableName);
        $params = $this->exportParams($table, $resolved->s->reachableAction((string) $request->route('tbtopAction')));
        $writer = $this->writer($request, $params['formats']);

        $query = $table?->queryClosure();
        $builder = $query === null ? null : $query();
        if (! $builder instanceof EloquentBuilder && ! $builder instanceof QueryBuilder) {
            throw new NotFoundHttpException("Table \"{$tableName}\" has no query on this page.");
        }
        /** @var TableBuilder $table */
        TableQuery::applyState($table, $request, $builder);
        $this->scopeToSelection($request, $builder);
        $this->assertWithinLimit($builder, $params['maxRows']);
        $columns = ExportColumns::resolve($table, $request);
        $filename = ($params['filename'] ?? $tableName.'-'.now()->format('Y-m-d')).'.'.$writer->extension();

        return new StreamedResponse(function () use ($table, $builder, $columns, $writer): void {
            $out = fopen('php://output', 'wb');
            if ($out === false) {
                return;
            }
            $writer->open($out, ExportColumns::headers($columns));
            foreach ($this->chunks($builder) as $rows) {
                foreach (ExportColumns::cells($table, $columns, $rows) as $cells) {
                    $writer->row($cells);
                }
            }
            $writer->close();
            fclose($out);
        }, 200, [
            'Content-Type' => $writer->contentType(),
            'Content-Disposition' => self::disposition($filename),
            'Cache-Control' => 'no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * The export action's params — only for an ExportAction that this user may
     * run and that sits on this very table; anything else is a 404.
     *
     * @return array{formats: list<string>, maxRows: int, filename?: string}
     */
    private function exportParams(?TableBuilder $table, ?ActionBuilder $action): array
    {
        $spec = $action?->getSpec();
        if ($table === null || $action === null || ($spec['type'] ?? null) !== 'custom'
            || ($spec['handler'] ?? null) !== ExportAction::HANDLER || ! $table->hasHeaderOrBulkAction($action->name)) {
            throw new NotFoundHttpException('Export not found on this table.');
        }

        /** @var array{formats: list<string>, maxRows: int, filename?: string} */
        return $spec['params'];
    }

    /** @param  list<string>  $formats */
    private function writer(Request $request, array $formats): ExportWriter
    {
        $requested = $request->query('format', $formats[0]);
        $format = is_string($requested) && in_array($requested, $formats, true) ? ExportFormat::tryFrom($requested) : null;

        return match ($format) {
            ExportFormat::Csv => new CsvWriter,
            ExportFormat::Xlsx => new XlsxWriter,
            null => throw new UnprocessableEntityHttpException(
                __('tbtop-admin::admin.export.unknown_format', ['format' => is_string($requested) ? $requested : '']),
            ),
        };
    }

    /** ids[] narrows the export to a selection — still inside the table's scope, as the query already is. */
    private function scopeToSelection(Request $request, EloquentBuilder|QueryBuilder $builder): void
    {
        if (! $request->has('ids')) {
            return;
        }
        $ids = Validator::make($request->query(), [
            'ids' => 'required|array|min:1',
            'ids.*' => ['required', static function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_string($value) && ! is_int($value)) {
                    $fail('The :attribute must be an integer or a string.');
                }
            }],
        ])->validate()['ids'];
        if ($builder instanceof ModelBuilder) {
            $builder->whereKey(array_values($ids));

            return;
        }
        $builder->whereIn('id', array_values($ids));
    }

    private function assertWithinLimit(EloquentBuilder|QueryBuilder $builder, int $maxRows): void
    {
        $count = (clone $builder)->count();
        if ($count > $maxRows) {
            throw new UnprocessableEntityHttpException(
                __('tbtop-admin::admin.export.too_many_rows', ['count' => number_format($count), 'max' => number_format($maxRows)]),
            );
        }
    }

    /**
     * Rows in chunks, in the table's sort order. An Eloquent query reads
     * page by page with its eager loads, ordered by the key as a tiebreak so
     * no row repeats or goes missing across pages; a plain query streams.
     *
     * @return iterable<int, iterable<int, mixed>>
     */
    private function chunks(EloquentBuilder|QueryBuilder $builder): iterable
    {
        if ($builder instanceof ModelBuilder) {
            $builder->orderBy($builder->getModel()->getQualifiedKeyName());

            return $builder->lazy(self::CHUNK)->chunk(self::CHUNK);
        }

        return $builder->cursor()->chunk(self::CHUNK);
    }

    private static function disposition(string $filename): string
    {
        $fallback = (string) preg_replace('/[^\x20-\x7E]|[\/\\\\%"]/', '_', $filename);

        return HeaderUtils::makeDisposition(HeaderUtils::DISPOSITION_ATTACHMENT, str_replace(['/', '\\'], '_', $filename), $fallback);
    }
}
