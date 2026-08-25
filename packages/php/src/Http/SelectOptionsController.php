<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST {page-path}/select-options/{tbtopField}
 *
 * Three modes, distinguished by request body:
 *   search mode — body: {search: string}     → {options: [{value, label, display?}]}
 *   resolve one — body: {value: string}      → {option: {value, label, display?}|null}
 *   resolve many — body: {values: string[]}  → {options: [{value, label, display?}]}
 *
 * `values` is a separate key rather than a `value` that also accepts an array:
 * the two answer with different shapes, and branching on the input's runtime
 * type is what made a multiple() select hang instead of erroring.
 *
 * Unlike relation-search this never touches Eloquent: the field's query()
 * closure owns the source, the filtering, and the result cap.
 */
final class SelectOptionsController
{
    use AuthorizesPage;

    public function __construct(private readonly SelectOptionsResponder $responder) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findQueryableSelect($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Select field \"{$fieldName}\" with query() is not defined on this page.",
            );
        }

        return $this->responder->respond($request, $field);
    }
}
