<?php

namespace Tbtop\Admin\Http;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
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
        // would save outside its own scope (a tenant, an active flag).
        if ($builder->getQuery()->wheres !== []) {
            throw new LogicException(
                "Relation field \"{$field->name}\" has a where() in query(): pass creatable() a closure that sets those columns.",
            );
        }

        $model = $builder->getModel()->newInstance();
        $model->fill($validated)->save();

        return $model;
    }
}
