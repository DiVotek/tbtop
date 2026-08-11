<?php

namespace Tbtop\Admin\Http;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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

        $table = $resolved->s->reachableTable($tableName);
        if ($table === null) {
            abort(404, "Table \"{$tableName}\" not found on this page.");
        }

        $col = $this->findEditableColumn($table->visibleColumns(), $columnName);
        if ($col === null) {
            abort(404, "Column \"{$columnName}\" is not editable on table \"{$tableName}\".");
        }

        // The client wraps the cell edit in a `payload` envelope, matching the
        // action endpoint contract (see ActionCtx::fromRequest).
        $payload = $request->input('payload', []);
        $payload = is_array($payload) ? $payload : [];

        $value = $this->validateValue($col, $columnName, $payload['value'] ?? null);
        $builder = $this->resolveBuilder($table);
        $record = $this->resolveRecord($builder, $payload['id'] ?? null);
        $effects = $this->runSave($col, $record, $value, $tableName);

        return response()->json(['effects' => $effects]);
    }

    /**
     * $columns must already be the visible set: server-invisible columns
     * (hidden() / visible(false)) are never editable, even when reachable by
     * name — the visibility closure is an authz gate.
     *
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

    private function validateValue(Column $col, string $columnName, mixed $value): mixed
    {
        $rules = $col->editRuleEntries();
        if ($rules === []) {
            return $value;
        }

        $label = $col->labelText();
        $attributes = $label === null ? [] : [$columnName => $label];

        $validated = Validator::make(
            [$columnName => $value],
            [$columnName => $rules],
            [],
            $attributes,
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

        $record = (clone $builder)->whereKey($id)->firstOrFail();

        return $this->quietSyntheticDirtiness($record);
    }

    /**
     * A query closure or a model event (retrieved(), an accessor, etc.) can
     * leave non-column attributes on the resolved record — a withExists()
     * alias, a computed flag stamped after hydration. Reading those in the
     * onSave closure is legitimate and must keep working; a clean alias is
     * never dirty by itself (its value matches what was just SELECTed), so
     * it never reaches save(). The only real threat is a synthetic attribute
     * that became dirty *after* hydration (e.g. a retrieved() listener
     * calling setAttribute()) — Eloquent would try to write it as a column.
     * Re-sync just that attribute's "original" so save() stops treating it
     * as changed, without touching any real column's dirty state.
     */
    private function quietSyntheticDirtiness(Model $record): Model
    {
        $dirty = array_keys($record->getDirty());
        if ($dirty === []) {
            return $record;
        }

        $columns = Schema::connection($record->getConnectionName())
            ->getColumnListing($record->getTable());

        $syntheticDirty = array_diff($dirty, $columns);
        if ($syntheticDirty !== []) {
            $record->syncOriginalAttributes(array_values($syntheticDirty));
        }

        return $record;
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
