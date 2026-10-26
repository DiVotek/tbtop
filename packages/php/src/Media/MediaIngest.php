<?php

namespace Tbtop\Admin\Media;

use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Uploads\ConversionProfile;

/** The one way a file becomes a `Media` row: admin endpoints and API callers share it. */
final class MediaIngest
{
    /** @throws MediaIngestException */
    public function store(UploadedFile $file, ?int $folderId = null, ?string $name = null, ?string $alt = null): Media
    {
        $config = $this->config();

        if (! MimePolicy::allows((string) $file->getMimeType(), $this->accept($config))) {
            throw new MediaIngestException(MediaIngestException::MIME_NOT_ALLOWED);
        }

        return $this->persist($file, $config, $folderId, $name, $alt, (string) $file->getMimeType(), (int) $file->getSize());
    }

    /** @throws MediaIngestException */
    public function import(string $url, ?int $folderId = null, ?string $name = null, ?string $alt = null): Media
    {
        $config = $this->config();

        try {
            $file = UrlFetcher::fetch($url, $this->accept($config));
        } catch (UrlFetchException $e) {
            throw new MediaIngestException($e->reason);
        }

        $tmpPath = $file->getPathname();

        try {
            return $this->persist($file, $config, $folderId, $name, $alt, (string) $file->getMimeType(), (int) filesize($tmpPath));
        } finally {
            @unlink($tmpPath);
        }
    }

    /** @throws MediaIngestException */
    public function replace(Media $media, UploadedFile $file): Media
    {
        $config = $this->config();

        if (! MimePolicy::allows((string) $file->getMimeType(), $this->accept($config))) {
            throw new MediaIngestException(MediaIngestException::MIME_NOT_ALLOWED);
        }

        $disk = $this->disk($config);
        $path = $this->storeSanitized($file, $disk);
        $image = MediaResource::imageAttributes($file, $path, $disk, ConversionProfile::fromConfig($config));

        // Old file and its conversions are removed only once the new upload
        // has been stored and sanitized — deleting them earlier would leave
        // $media->path pointing at nothing if sanitization then rejects the
        // replacement. deleteFiles() reads $media->path, so this must run
        // before update() overwrites it.
        MediaResource::deleteFiles($media);

        $media->update([
            'name' => $file->getClientOriginalName(),
            'disk' => $disk,
            'path' => $path,
            'mime' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
            ...$image,
        ]);

        return $media->refresh();
    }

    /** @param array<string, mixed> $config */
    private function persist(UploadedFile $file, array $config, ?int $folderId, ?string $name, ?string $alt, string $mime, int $size): Media
    {
        $disk = $this->disk($config);
        $path = $this->storeSanitized($file, $disk);
        $image = MediaResource::imageAttributes($file, $path, $disk, ConversionProfile::fromConfig($config));

        return Media::create([
            'folder_id' => $folderId,
            'name' => ($name !== null && $name !== '') ? $name : $file->getClientOriginalName(),
            'disk' => $disk,
            'path' => $path,
            'mime' => $mime,
            'size' => $size,
            ...$image,
            'alt' => $alt,
        ]);
    }

    private function storeSanitized(UploadedFile $file, string $disk): string
    {
        $path = $file->store('tbtop-media', $disk);
        if ($path === false) {
            throw new MediaIngestException(MediaIngestException::STORE_FAILED);
        }

        try {
            SvgSanitizer::sanitizeStored($disk, $path, $file->getClientOriginalName());
        } catch (SvgSanitizeException $e) {
            throw new MediaIngestException($e->reason);
        }

        return $path;
    }

    /** @return array<string, mixed> */
    private function config(): array
    {
        $cfg = config('tbtop-admin.media');

        return is_array($cfg) ? $cfg : [];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<string>
     */
    private function accept(array $config): array
    {
        /** @var list<string> */
        return (array) ($config['accept'] ?? []);
    }

    /** @param array<string, mixed> $config */
    private function disk(array $config): string
    {
        return (string) ($config['disk'] ?? 'public');
    }
}
