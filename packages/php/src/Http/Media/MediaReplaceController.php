<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\MediaIngest;
use Tbtop\Admin\Media\MediaIngestException;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\MediaUploadLimit;
use Tbtop\Admin\Media\Models\Media;

final class MediaReplaceController
{
    public function __invoke(Request $request, MediaIngest $ingest, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:'.MediaUploadLimit::kilobytes(),
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        try {
            $media = $ingest->replace($media, $file);
        } catch (MediaIngestException $e) {
            $this->abortWith($e);
        }

        return response()->json(MediaResource::toItem($media));
    }

    private function abortWith(MediaIngestException $e): never
    {
        if ($e->reason === MediaIngestException::STORE_FAILED) {
            abort(500, 'Upload failed.');
        }

        abort(422, __('tbtop-admin::admin.media.errors.'.$e->reason));
    }
}
