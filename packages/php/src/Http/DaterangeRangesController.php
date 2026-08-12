<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST {page-path}/daterange-ranges/{tbtopField} — body: {deps: {field: value}}
 *
 * Re-runs a daterange's disabledRanges() closure with the client's current
 * parent values and answers {ranges: [...]}. The page is rebuilt per request,
 * so anything the closure captured resolves server-side exactly as on the GET
 * render; only the deps bag is client-controlled, filtered against the
 * declared dependsOn() list. A field without dependsOn() never fetches — its
 * serialized ranges are final.
 */
final class DaterangeRangesController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findDaterangeField($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException(
                "Daterange field \"{$fieldName}\" with disabledRanges() is not defined on this page.",
            );
        }

        $deps = DependencyPayload::read($request, $field->dependsOnFields());

        return response()->json(['ranges' => $field->rangesWith($deps)]);
    }
}
