<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\RuleWalker;
use UnexpectedValueException;

/**
 * POST {page-path}/relation-create/{tbtopField}
 *
 * Validates the mini-form payload via RuleWalker, creates the related record —
 * through the field's creatable() closure, or by filling a new instance of the
 * query() model — and returns it as {value, label}.
 */
final class RelationCreateController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findRelationField($fieldName);

        if ($field === null || ! $field->isCreatable()) {
            throw new NotFoundHttpException(
                "Relation field \"{$fieldName}\" with creatable() is not defined on this page.",
            );
        }

        $rules = RuleWalker::collect($field->creatableFields());
        $attributes = RuleWalker::collectAttributes($field->creatableFields());
        $validated = $request->validate($rules, [], $attributes);
        $deps = DependencyPayload::read($request, $field->dependsOnFields());

        $model = self::create($field, $validated, $deps);

        return response()->json(RelationSearchResponder::toOption($model, $field->getLabelKey()));
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, string>  $deps
     */
    private static function create(Relation $field, array $validated, array $deps): Model
    {
        $using = $field->creatableClosure();
        $model = $using === null
            ? self::fillAndSave($field, $validated, $deps)
            : $using($validated, $deps);

        if (! $model instanceof Model) {
            throw new UnexpectedValueException(
                "Relation field \"{$field->name}\": creatable() must return the created Eloquent model.",
            );
        }

        return $model;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array<string, string>  $deps
     */
    private static function fillAndSave(Relation $field, array $validated, array $deps): Model
    {
        // A dependent query is scoped by its parents, and a bare fill would
        // save the row outside that scope; only the author knows the parent key.
        if ($field->dependsOnFields() !== []) {
            throw new LogicException(
                "Relation field \"{$field->name}\" uses dependsOn(): pass creatable() a closure that sets the parent.",
            );
        }

        $query = $field->queryClosure();
        // findRelationField() only returns a field that has a query closure.
        assert($query instanceof Closure);
        $builder = $query($deps);
        assert($builder instanceof Builder);
        // The where() clauses are not copied onto the new row, so a scoped query
        // would save outside its own scope (a tenant, an active flag). Global
        // scopes add theirs only in applyScopes(); SoftDeletes is left out, since
        // a new row is never trashed.
        $scoped = (clone $builder)->withoutGlobalScope(SoftDeletingScope::class)->applyScopes();
        if ($scoped->getQuery()->wheres !== []) {
            throw new LogicException(
                "Relation field \"{$field->name}\" has a where() in query(): pass creatable() a closure that sets those columns.",
            );
        }

        $model = $builder->getModel()->newInstance();
        // The model's mass-assignment rules stay in force, but loudly: fill()
        // would drop a guarded key in silence and save a row without it.
        $guarded = array_values(array_filter(array_keys($validated), fn (string $key) => ! $model->isFillable($key)));
        if ($guarded !== []) {
            throw new LogicException(
                "Relation field \"{$field->name}\": ".implode(', ', $guarded).' is not fillable on '.$model::class.': add it to $fillable or pass creatable() a closure.',
            );
        }
        $model->fill($validated)->save();

        return $model;
    }
}
