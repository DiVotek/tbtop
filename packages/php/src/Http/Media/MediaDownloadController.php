<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tbtop\Admin\Media\Models\Media;

final class MediaDownloadController
{
    public function __invoke(int $id): StreamedResponse
    {
        $media = Media::findOrFail($id);

        return Storage::disk($media->disk)
            ->download($media->path, $media->name, [
                'X-Content-Type-Options' => 'nosniff',
            ]);
    }
}
