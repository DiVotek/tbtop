<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST {page-path}/live-region/{tbtopRegion} — body: {deps: {field: value}}
 *
 * Re-runs a liveRegion's render closure with the client's current form values
 * and answers {nodes: [...]} — fresh display nodes replacing the region's
 * content. The page is rebuilt per request, so anything the closure captured
 * (the record, the authorized user) resolves server-side exactly as on the
 * GET render; only the deps bag is client-controlled, filtered against the
 * declared dependsOn() list.
 */
final class LiveRegionController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $name = (string) $request->route('tbtopRegion');
        $resolved = ResolvedPage::fromRequest($request);
        $region = $resolved->s->findLiveRegion($name);

        if ($region === null) {
            throw new NotFoundHttpException(
                "Live region \"{$name}\" is not defined on this page.",
            );
        }

        $deps = DependencyPayload::read($request, $region->dependsOnFields());

        return response()->json(['nodes' => $region->renderWith($deps)]);
    }
}
