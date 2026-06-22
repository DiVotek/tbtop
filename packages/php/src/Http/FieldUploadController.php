<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Uploads\UploadFieldConfig;
use Tbtop\Admin\Uploads\UploadFieldUrl;
use Tbtop\Admin\Uploads\UploadStorer;

/**
 * POST {page-path}/uploads/{tbtopField}
 *
 * Page-scoped upload: disk, directory, accept, conversion all come from the
 * Upload field's DSL config on the resolved page — the client cannot override
 * them. Inherits the page gate via AuthorizesPage. A private field's response
 * urls are signed so the just-uploaded file previews immediately.
 */
final class FieldUploadController
{
    use AuthorizesPage;

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findUploadField($fieldName);

        if ($field === null) {
            throw new NotFoundHttpException("Upload field \"{$fieldName}\" is not defined on this page.");
        }

        $config = UploadFieldConfig::resolve($field);
        $maxKb = (int) ($config->maxSize / 1024);
        $request->validate(['file' => "required|file|max:{$maxKb}"]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $config->assertMime($file);

        $saver = $field->saveClosure()
            ?? static fn (UploadedFile $f, UploadFieldConfig $c): array => UploadStorer::store($f, $c);

        return response()->json(['data' => $this->signed($saver($file, $config), $config, $request, $fieldName)]);
    }

    /**
     * Private files can't be linked publicly; rewrite the envelope's url and
     * each variant url to a short-lived signed view-route url. Public: pass through.
     *
     * @param  array<string, mixed>  $envelope
     * @return array<string, mixed>
     */
    private function signed(array $envelope, UploadFieldConfig $config, Request $request, string $field): array
    {
        if ($config->visibility !== 'private') {
            return $envelope;
        }

        $viewRoute = Str::replaceLast('.upload', '.uploadView', (string) $request->route()->getName());
        // tbtopField/path are supplied explicitly by SignedUploadUrl — drop the route-only keys.
        $pageParams = ResolvedPage::routeParams($request);
        unset($pageParams['tbtopField'], $pageParams['path']);
        $envelope['url'] = UploadFieldUrl::for($config, $field, $config->directory.'/'.$envelope['id'], $viewRoute, $pageParams);

        if (isset($envelope['sizes']) && is_array($envelope['sizes'])) {
            $envelope['sizes'] = array_map(
                static fn (array $v): array => [
                    ...$v,
                    'url' => UploadFieldUrl::for($config, $field, $config->directory.'/'.$v['filename'], $viewRoute, $pageParams),
                ],
                $envelope['sizes'],
            );
        }

        return $envelope;
    }
}
