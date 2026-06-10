<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Dsl\RuleWalker;

/**
 * POST {page-path}/select-create/{tbtopField}
 *
 * Validates the mini-form payload via RuleWalker, calls the field's
 * using() closure, and returns {value, label}.
 */
final class SelectCreateController
{
    public function __invoke(Request $request): JsonResponse
    {
        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findCreatableSelect($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Select field \"{$fieldName}\" with creatable() is not defined on this page.",
            );
        }

        $rules = RuleWalker::collect($field->creatableFields());
        $validated = $request->validate($rules);

        $closure = $field->creatableClosure();
        /** @var array{value: string, label: string} $result */
        $result = $closure($validated);

        return response()->json($result);
    }
}
