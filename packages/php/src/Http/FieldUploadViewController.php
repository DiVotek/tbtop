<?php

namespace Tbtop\Admin\Http;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Uploads\UploadFieldConfig;

/**
 * GET {page-path}/uploads/{tbtopField}/view?path=…
 *
 * Streams a private upload through the app. Reached only via a signed url
 * (route carries the `signed` middleware), and still enforces the page gate +
 * a directory-zone check so a valid signature can never escape the field's own
 * upload directory. Public fields have no stream endpoint.
 */
final class FieldUploadViewController
{
    use AuthorizesPage;

    public function __invoke(Request $request): StreamedResponse
    {
        $this->authorizePageGate($request);

        $fieldName = (string) $request->route('tbtopField');
        $resolved = ResolvedPage::fromRequest($request);
        $field = $resolved->s->findUploadField($fieldName);
        if ($field === null) {
            throw new NotFoundHttpException("Upload field \"{$fieldName}\" is not defined on this page.");
        }

        $config = UploadFieldConfig::resolve($field);
        if ($config->visibility !== 'private') {
            abort(404);
        }

        $path = (string) $request->query('path');
        $this->assertInZone($path, $config->directory);

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($config->disk);
        if (! $disk->exists($path)) {
            abort(404);
        }

        return $disk->response($path, null, ['X-Content-Type-Options' => 'nosniff']);
    }

    /** A signed path must still stay inside the field's own upload directory. */
    private function assertInZone(string $path, string $directory): void
    {
        if (str_contains($path, '..')) {
            abort(403);
        }
        if (! str_starts_with($path, trim($directory, '/').'/')) {
            abort(403);
        }
    }
}
