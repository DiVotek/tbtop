<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** POST {page-path}/tables/{tbtopTable}/filters/{tbtopFilter}/options */
final class TableFilterOptionsController
{
    use AuthorizesPage;

    public function __construct(private readonly SelectOptionsResponder $responder) {}

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $tableName = (string) $request->route('tbtopTable');
        $filterName = (string) $request->route('tbtopFilter');
        $resolved = ResolvedPage::fromRequest($request);
        $table = $resolved->s->reachableTable($tableName);
        $field = $table?->findQueryableSelectFilter($filterName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Query-backed Select filter \"{$filterName}\" is not defined on table \"{$tableName}\".",
            );
        }

        return $this->responder->respond($request, $field);
    }
}
