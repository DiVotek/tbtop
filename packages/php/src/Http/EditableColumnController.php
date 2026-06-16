<?php

namespace Tbtop\Admin\Http;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\Column;
use Tbtop\Admin\Dsl\TableBuilder;

/**
 * POST {page-path}/cells/{tbtopTable}/{tbtopColumn}
 *
 * Validates a single cell value, resolves the row, and calls the column's
 * onSave closure. Returns an Effects envelope to the client.
 */
final class EditableColumnController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $tableName = (string) $request->route('tbtopTable');
        $columnName = (string) $request->route('tbtopColumn');
        $resolved = ResolvedPage::fromRequest($request);

        $table = $resolved->s->collectedTables()[$tableName] ?? null;
        if ($table === null) {
            abort(404, "Table \"{$tableName}\" not found on this page.");
        }

        $col = $this->findEditableColumn($table->allColumns(), $columnName);
        if ($col === null) {
            abort(404, "Column \"{$columnName}\" is not editable on table \"{$tableName}\".");
        }

        $value = $this->validateValue($request, $col, $columnName);
        $builder = $this->resolveBuilder($table);
        $id = $request->input('id');
        $record = $this->resolveRecord($builder, $id);
        $effects = $this->runSave($col, $record, $value, $tableName);

        return response()->json(['effects' => $effects]);
    }

    /**
     * @param  list<Column>  $columns
     */
    private function findEditableColumn(array $columns, string $name): ?Column
    {
        foreach ($columns as $col) {
            if ($col->name === $name && $col->isEditable()) {
                return $col;
            }
        }

        return null;
    }

    private function validateValue(Request $request, Column $col, string $columnName): mixed
    {
        $rules = $col->editRuleEntries();
        if ($rules === []) {
            return $request->input('value');
        }

        $validated = Validator::make(
            [$columnName => $request->input('value')],
            [$columnName => $rules],
        )->validate();

        return $validated[$columnName];
    }

    private function resolveBuilder(TableBuilder $table): EloquentBuilder
    {
        $closure = $table->queryClosure();
        if ($closure === null) {
            abort(422, 'Editable columns require a query closure on the table.');
        }

        $builder = $closure();
        if (! $builder instanceof EloquentBuilder) {
            abort(422, 'Editable columns require an Eloquent query closure.');
        }

        return $builder;
    }

    private function resolveRecord(EloquentBuilder $builder, mixed $id): mixed
    {
        if ($id === null) {
            abort(422, 'Missing record id.');
        }

        return (clone $builder)->whereKey($id)->firstOrFail();
    }

    private function runSave(
        Column $col,
        mixed $record,
        mixed $value,
        string $tableName,
    ): Effects {
        $closure = $col->onSaveClosure();
        if ($closure === null) {
            abort(422, 'onSave closure is missing on this editable column.');
        }

        $result = $closure($record, $value);

        return $result instanceof Effects ? $result : Effects::make()->refreshTable($tableName);
    }
}
