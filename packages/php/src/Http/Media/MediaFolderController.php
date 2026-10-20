<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;

final class MediaFolderController
{
    public function index(): JsonResponse
    {
        $folders = MediaFolder::orderBy('name')->get();

        return response()->json(
            $folders->map(fn (MediaFolder $f) => MediaResource::toFolder($f))->values()->all()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'parentId' => 'nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $folder = MediaFolder::create([
            'name' => $data['name'],
            'parent_id' => $data['parentId'] ?? null,
        ]);

        return response()->json(MediaResource::toFolder($folder), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $folder = MediaFolder::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'parentId' => 'sometimes|nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $fill = [];
        if (array_key_exists('name', $data)) {
            $fill['name'] = $data['name'];
        }
        if (array_key_exists('parentId', $data)) {
            $this->assertNotOwnAncestor($id, $data['parentId']);
            $fill['parent_id'] = $data['parentId'];
        }

        $folder->update($fill);

        return response()->json(MediaResource::toFolder($folder->refresh()));
    }

    /**
     * Moving a folder under itself or one of its descendants would detach the
     * subtree from the root in a parent cycle no listing could reach.
     */
    private function assertNotOwnAncestor(int $id, mixed $parentId): void
    {
        $seen = [];
        $current = $parentId === null ? null : (int) $parentId;
        while ($current !== null && ! isset($seen[$current])) {
            if ($current === $id) {
                throw ValidationException::withMessages([
                    'parentId' => __('tbtop-admin::admin.media.errors.folder_cycle'),
                ]);
            }
            $seen[$current] = true;
            $current = MediaFolder::whereKey($current)->value('parent_id');
            $current = $current === null ? null : (int) $current;
        }
    }

    public function destroy(int $id): Response|JsonResponse
    {
        $folder = MediaFolder::findOrFail($id);

        $hasMedia = Media::where('folder_id', $id)->exists();
        $hasChildren = MediaFolder::where('parent_id', $id)->exists();

        if ($hasMedia || $hasChildren) {
            return response()->json(
                ['message' => __('tbtop-admin::admin.media.errors.folder_not_empty')],
                409,
            );
        }

        $folder->delete();

        return response()->noContent();
    }
}
