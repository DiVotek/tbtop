<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tbtop\Admin\Media\Models\Media;

final class MediaDownloadController
{
    public function __invoke(int $id): StreamedResponse
    {
        $media = Media::findOrFail($id);

        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($media->disk);
        // A row whose file is gone from the disk (deleted by hand, disk swapped)
        // is a 404, not a 500 from reading the missing file's size.
        if (! $disk->exists($media->path)) {
            abort(404);
        }

        return $disk->download($media->path, $media->name, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
