<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;

final class MediaController
{
    /** Columns that files may be ordered by; anything else falls back to the default. */
    private const SORTABLE_COLUMNS = ['name', 'size', 'created_at'];

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(200, (int) ($request->query('perPage', 24))));
        $page = max(1, (int) ($request->query('page', 1)));
        $search = (string) ($request->query('search', ''));
        $folderId = $request->query('folder');

        [$sortColumn, $sortDir] = $this->resolveSort($request);
        $query = Media::query()->orderBy($sortColumn, $sortDir);

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
            'folders' => $this->childFolders($folderId),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
        ]);
    }

    /**
     * Resolve the file sort from whitelisted query params. Unknown columns or
     * directions fall back to the default (created_at desc) — never raw input
     * into orderBy.
     *
     * @return array{0: string, 1: string}
     */
    private function resolveSort(Request $request): array
    {
        $sort = (string) ($request->query('sort', ''));
        $column = in_array($sort, self::SORTABLE_COLUMNS, true) ? $sort : 'created_at';

        $dir = strtolower((string) ($request->query('dir', '')));
        $direction = $dir === 'asc' ? 'asc' : 'desc';

        return [$column, $direction];
    }

    /**
     * Child folders of the current level — all of them, never paginated.
     *
     * @param  mixed  $folderId
     * @return array<int, array{id: int, name: string, parentId: int|null}>
     */
    private function childFolders($folderId): array
    {
        $query = MediaFolder::query()->orderBy('name');

        if ($folderId === '' || $folderId === null) {
            $query->whereNull('parent_id');
        } else {
            $query->where('parent_id', (int) $folderId);
        }

        return $query->get()
            ->map(fn (MediaFolder $f) => MediaResource::toFolder($f))
            ->values()
            ->all();
    }

    public function show(int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        return response()->json(MediaResource::toItem($media));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'alt' => 'sometimes|nullable|string|max:500',
            'description' => 'sometimes|nullable|string|max:2000',
            'tags' => 'sometimes|nullable|array|max:30',
            'tags.*' => 'string|max:50',
            'folderId' => 'sometimes|nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $fill = [];
        if (array_key_exists('name', $data)) {
            $fill['name'] = $data['name'];
        }
        if (array_key_exists('alt', $data)) {
            $fill['alt'] = $data['alt'];
        }
        if (array_key_exists('description', $data)) {
            $fill['description'] = $data['description'];
        }
        if (array_key_exists('tags', $data)) {
            $fill['tags'] = $data['tags'];
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
