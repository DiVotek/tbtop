<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;

final class MediaController
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(200, (int) ($request->query('perPage', 24))));
        $page = max(1, (int) ($request->query('page', 1)));
        $search = (string) ($request->query('search', ''));
        $folderId = $request->query('folder');

        $query = Media::query()->orderBy('created_at', 'desc');

        if ($folderId === '' || $folderId === null) {
            $query->whereNull('folder_id');
        } else {
            $query->where('folder_id', (int) $folderId);
        }

        if ($search !== '') {
            $query->where('name', 'like', '%'.$search.'%');
        }

        $total = (int) $query->count();
        $items = $query->forPage($page, $perPage)->get();

        return response()->json([
            'data' => $items->map(fn (Media $m) => MediaResource::toItem($m))->values()->all(),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'alt' => 'sometimes|nullable|string|max:500',
            'folderId' => 'sometimes|nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $fill = [];
        if (array_key_exists('name', $data)) {
            $fill['name'] = $data['name'];
        }
        if (array_key_exists('alt', $data)) {
            $fill['alt'] = $data['alt'];
        }
        if (array_key_exists('folderId', $data)) {
            $fill['folder_id'] = $data['folderId'];
        }

        $media->update($fill);

        return response()->json(MediaResource::toItem($media->refresh()));
    }

    public function destroy(int $id): Response
    {
        $media = Media::findOrFail($id);
        MediaResource::deleteFiles($media);
        $media->delete();

        return response()->noContent();
    }
}
