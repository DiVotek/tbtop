<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST {page-path}/relation-search/{tbtopField}
 *
 * Two modes, distinguished by request body:
 *   search mode  — body: {search: string}  → {options: [{value, label}]}
 *   resolve mode — body: {value: string}   → {option: {value, label}|null}
 */
final class RelationSearchController
{
    use AuthorizesPage;

    public function __construct(private readonly RelationSearchResponder $responder) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findRelationField($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Relation field \"{$fieldName}\" with query() is not defined on this page.",
            );
        }

        return $this->responder->respond($request, $field);
    }
}
