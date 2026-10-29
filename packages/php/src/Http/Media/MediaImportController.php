<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tbtop\Admin\Media\MediaIngest;
use Tbtop\Admin\Media\MediaIngestException;
use Tbtop\Admin\Media\MediaResource;

final class MediaImportController
{
    public function __invoke(Request $request, MediaIngest $ingest): JsonResponse
    {
        $request->validate([
            'url' => 'required|string',
            'name' => 'nullable|string|max:255',
            'folderId' => 'nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $customName = $request->input('name');

        try {
            $media = $ingest->import(
                (string) $request->input('url'),
                $request->input('folderId') !== null ? (int) $request->input('folderId') : null,
                is_string($customName) ? $customName : null,
            );
        } catch (MediaIngestException $e) {
            $reason = $e->reason === MediaIngestException::STORE_FAILED
                ? MediaIngestException::DOWNLOAD_FAILED
                : $e->reason;

            return $this->error422('media.errors.'.$reason);
        }

        return response()->json(MediaResource::toItem($media), 201);
    }

    private function error422(string $langKey): JsonResponse
    {
        return response()->json(
            ['message' => __('tbtop-admin::admin.'.$langKey)],
            422,
        );
    }
}
