<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Uploads\UploadFieldConfig;
use Tbtop\Admin\Uploads\UploadStorer;

/**
 * POST {page-path}/uploads/{tbtopField}
 *
 * Page-scoped upload: disk, directory, accept, conversion all come from the
 * Upload field's DSL config on the resolved page — the client cannot override
 * them. Inherits the page gate via AuthorizesPage.
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

        return response()->json(['data' => UploadStorer::store($file, $config)]);
    }
}
