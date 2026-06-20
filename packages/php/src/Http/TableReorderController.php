<?php

namespace Tbtop\Admin\Http;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\TableBuilder;

/**
 * POST {page-path}/tables/{tbtopTable}/reorder
 *
 * Persists drag-and-drop row order by writing each id's array index to the
 * table's declared reorder column. The query closure scopes which rows the
 * caller may touch — ids outside that scope are rejected (the reorder analogue
 * of the editable-column "id outside scope" guard).
 */
final class TableReorderController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $tableName = (string) $request->route('tbtopTable');
        $table = $this->resolveTable($request, $tableName);
        $column = $this->resolveColumn($table);
        $ids = $this->validateIds($request);

        $builder = $this->resolveBuilder($table);
        $this->assertIdsInScope($builder, $ids);
        $this->persistOrder($builder, $ids, $column);

        return response()->json(['effects' => Effects::make()->refreshTable($tableName)]);
    }

    private function resolveTable(Request $request, string $tableName): TableBuilder
    {
        $resolved = ResolvedPage::fromRequest($request);
        $table = $resolved->s->collectedTables()[$tableName] ?? null;
        if ($table === null) {
            abort(404, "Table \"{$tableName}\" not found on this page.");
        }

        return $table;
    }

    private function resolveColumn(TableBuilder $table): string
    {
        $column = $table->reorderColumn();
        if ($column === null) {
            abort(422, "Table \"{$table->name}\" is not reorderable.");
        }

        return $column;
    }

    /** @return list<int|string> */
    private function validateIds(Request $request): array
    {
        $validated = Validator::make($request->all(), [
            'ids' => 'required|array|min:1',
            'ids.*' => 'required',
        ])->validate();

        /** @var list<int|string> */
        return array_values($validated['ids']);
    }

    private function resolveBuilder(TableBuilder $table): EloquentBuilder
    {
        $closure = $table->queryClosure();
        if ($closure === null) {
            abort(422, 'Reordering requires a query closure on the table.');
        }

        $builder = $closure();
        if (! $builder instanceof EloquentBuilder) {
            abort(422, 'Reordering requires an Eloquent query closure.');
        }

        return $builder;
    }

    /**
     * Reject the whole request when any id falls outside the scoped query —
     * a client must not reorder rows it cannot see.
     *
     * @param  list<int|string>  $ids
     */
    private function assertIdsInScope(EloquentBuilder $builder, array $ids): void
    {
        $existing = (clone $builder)->whereKey($ids)->count();
        if ($existing !== count($ids)) {
            abort(422, 'One or more ids are outside the table scope.');
        }
    }

    /**
     * Write each id's position to the reorder column inside one transaction.
     *
     * @param  list<int|string>  $ids
     */
    private function persistOrder(EloquentBuilder $builder, array $ids, string $column): void
    {
        DB::transaction(function () use ($builder, $ids, $column): void {
            foreach ($ids as $index => $id) {
                (clone $builder)->whereKey($id)->update([$column => $index]);
            }
        });
    }
}
