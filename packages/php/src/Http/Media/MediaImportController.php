<?php

namespace Tbtop\Admin\Http\Media;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tbtop\Admin\Media\MediaResource;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\SsrfGuard;
use Tbtop\Admin\Media\SvgSanitizer;

final class MediaImportController
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'url' => 'required|string',
            'name' => 'nullable|string|max:255',
            'folderId' => 'nullable|integer|exists:tbtop_media_folders,id',
        ]);

        $url = (string) $request->input('url');

        if (SsrfGuard::isBlocked($url)) {
            return $this->error422('media.errors.blocked_url');
        }

        $config = $this->importConfig();
        $timeout = (int) ($config['timeout'] ?? 30);
        $maxBytes = (int) ($config['max_size'] ?? 10240) * 1024;

        $accept = (array) (config('tbtop-admin.media.accept') ?? []);

        $filename = $this->filenameFromUrl($url);
        $tempDescriptor = tempnam(sys_get_temp_dir(), 'tbtop_media_');
        if ($tempDescriptor === false) {
            return $this->error422('media.errors.download_failed');
        }
        $tmpPath = $tempDescriptor.'_'.$filename;

        try {
            $oversized = false;
            try {
                $response = Http::timeout($timeout)
                    ->withOptions([
                        'allow_redirects' => false,
                        'progress' => $this->abortOnOversize($maxBytes, $oversized),
                        ...SsrfGuard::pinnedDnsCurlOption($url),
                    ])
                    ->sink($tmpPath)
                    ->get($url);
            } catch (ConnectionException $e) {
                if ($oversized || $this->causedByOversize($e)) {
                    return $this->error422('media.errors.file_too_large');
                }

                return $this->error422('media.errors.download_failed');
            } catch (\Throwable $e) {
                if ($oversized || $this->causedByOversize($e)) {
                    return $this->error422('media.errors.file_too_large');
                }

                return $this->error422('media.errors.download_failed');
            }

            if (! $response->successful()) {
                return $this->error422('media.errors.download_failed');
            }

            if (is_file($tmpPath) && filesize($tmpPath) > $maxBytes) {
                return $this->error422('media.errors.file_too_large');
            }

            // Double MIME check: Content-Type header + finfo on disk
            $headerMime = $this->primaryMime((string) $response->header('Content-Type'));
            if ($headerMime !== '' && ! $this->isAllowedMime($headerMime, $accept)) {
                return $this->error422('media.errors.mime_not_allowed');
            }

            $detectedMime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($tmpPath);
            if (! $this->isAllowedMime($detectedMime, $accept)) {
                return $this->error422('media.errors.mime_not_allowed');
            }

            $config2 = $this->mediaConfig();
            $disk = (string) ($config2['disk'] ?? 'public');
            $dir = 'tbtop-media';

            $file = new UploadedFile($tmpPath, $filename, $detectedMime, test: true);
            $path = $file->store($dir, $disk);
            if ($path === false) {
                return $this->error422('media.errors.download_failed');
            }

            SvgSanitizer::sanitizeStored($disk, $path, $filename);

            /** @var array<string, array{0: int, 1: int}> $profiles */
            $profiles = (array) ($config2['profiles'] ?? []);
            $sizes = MediaResource::generateConversions($file, $path, $disk, $profiles);

            $customName = $request->input('name');
            $name = (is_string($customName) && $customName !== '') ? $customName : $filename;

            $media = Media::create([
                'folder_id' => $request->input('folderId') !== null ? (int) $request->input('folderId') : null,
                'name' => $name,
                'disk' => $disk,
                'path' => $path,
                'mime' => $detectedMime,
                'size' => (int) filesize($tmpPath),
                'sizes' => $sizes,
                'alt' => null,
            ]);

            return response()->json(MediaResource::toItem($media), 201);
        } finally {
            @unlink($tmpPath);
            @unlink($tempDescriptor);
        }
    }

    /** @return array<string, mixed> */
    private function importConfig(): array
    {
        $cfg = config('tbtop-admin.media.url_import');

        return is_array($cfg) ? $cfg : [];
    }

    /** @return array<string, mixed> */
    private function mediaConfig(): array
    {
        $cfg = config('tbtop-admin.media');

        return is_array($cfg) ? $cfg : [];
    }

    private function error422(string $langKey): JsonResponse
    {
        return response()->json(
            ['message' => __('tbtop-admin::admin.'.$langKey)],
            422,
        );
    }

    /**
     * Guzzle progress callback. Sets $oversized flag and throws to abort the
     * transfer mid-stream when bytes received exceed the configured cap.
     */
    private function abortOnOversize(int $maxBytes, bool &$oversized): \Closure
    {
        return function (int $dlTotal, int $dlNow) use ($maxBytes, &$oversized): void {
            if ($dlNow > $maxBytes) {
                $oversized = true;
                throw new \RuntimeException('Download too large');
            }
        };
    }

    private function causedByOversize(\Throwable $e): bool
    {
        for ($cur = $e; $cur !== null; $cur = $cur->getPrevious()) {
            if (str_contains($cur->getMessage(), 'Download too large')) {
                return true;
            }
        }

        return false;
    }

    private function primaryMime(string $header): string
    {
        $parts = explode(';', $header, 2);

        return trim(strtolower($parts[0]));
    }

    /**
     * @param  list<string>  $accept
     */
    private function isAllowedMime(string $mime, array $accept): bool
    {
        // text/html is active content (the SVG-as-html XSS vector). Refuse it
        // even when the accept list allows text/* — it is never a media file.
        if (str_starts_with($mime, 'text/html')) {
            return false;
        }

        if ($accept === []) {
            return true;
        }

        foreach ($accept as $pattern) {
            if (fnmatch((string) $pattern, $mime)) {
                return true;
            }
        }

        return false;
    }

    private function filenameFromUrl(string $url): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        $basename = basename($path);
        $sanitized = preg_replace('/[^A-Za-z0-9._-]/', '_', $basename) ?? '';

        if ($sanitized === '' || ! str_contains($sanitized, '.')) {
            return 'download_'.time().'.bin';
        }

        return $sanitized;
    }
}
