<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\MediaIngest;
use Tbtop\Admin\Media\MediaIngestException;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\MediaUploadLimit;

final class MediaUploadController
{
    public function __invoke(Request $request, MediaIngest $ingest): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:'.MediaUploadLimit::kilobytes(),
            'folderId' => 'nullable|integer|exists:tbtop_media_folders,id',
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');

        try {
            $media = $ingest->store(
                $file,
                $request->input('folderId') !== null ? (int) $request->input('folderId') : null,
            );
        } catch (MediaIngestException $e) {
            $this->abortWith($e);
        }

        return response()->json(MediaResource::toItem($media), 201);
    }

    private function abortWith(MediaIngestException $e): never
    {
        if ($e->reason === MediaIngestException::STORE_FAILED) {
            abort(500, 'Upload failed.');
        }

        abort(422, __('tbtop-admin::admin.media.errors.'.$e->reason));
    }
}
