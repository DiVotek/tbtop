<?php

namespace Tbtop\Admin\Media;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Downloads a user-supplied URL into a temporary UploadedFile.
 *
 * Fetching an arbitrary URL server-side is an SSRF sink, so every guard is
 * load-bearing: SsrfGuard pins DNS (a bare pre-flight check is defeated by a
 * rebind between check and request), redirects are refused because a 302
 * escapes that check, the size cap aborts mid-transfer, and the mime is
 * verified from disk content, not the Content-Type header alone.
 */
final class UrlFetcher
{
    /**
     * Caller must @unlink() the returned file's path.
     *
     * @param  list<string>  $accept  fnmatch patterns; empty allows everything
     *
     * @throws UrlFetchException
     */
    public static function fetch(string $url, array $accept): UploadedFile
    {
        $pinnedDns = SsrfGuard::pinnedDnsCurlOption($url);
        if (! self::hostAllowed($url) || $pinnedDns === []) {
            throw new UrlFetchException(UrlFetchException::BLOCKED_URL);
        }

        $maxBytes = MediaUploadLimit::bytes();
        $filename = self::filenameFromUrl($url);
        $tmpPath = self::tempPath();
        $oversized = false;

        try {
            $response = Http::timeout(self::timeout())
                ->withOptions([
                    'allow_redirects' => false,
                    'progress' => static function (int $dlTotal, int $dlNow) use ($maxBytes, &$oversized): void {
                        if ($dlNow > $maxBytes) {
                            $oversized = true;
                            throw new UrlFetchException(UrlFetchException::FILE_TOO_LARGE);
                        }
                    },
                    ...$pinnedDns,
                ])
                ->sink($tmpPath)
                ->get($url);
        } catch (Throwable $e) {
            @unlink($tmpPath);
            throw new UrlFetchException(
                $oversized || self::causedByOversize($e)
                    ? UrlFetchException::FILE_TOO_LARGE
                    : UrlFetchException::DOWNLOAD_FAILED,
            );
        }

        if (! $response->successful()) {
            @unlink($tmpPath);
            throw new UrlFetchException(UrlFetchException::DOWNLOAD_FAILED);
        }

        $headerMime = MimePolicy::fromHeader((string) $response->header('Content-Type'));
        if ($headerMime !== '' && ! MimePolicy::allows($headerMime, $accept)) {
            @unlink($tmpPath);
            throw new UrlFetchException(UrlFetchException::MIME_NOT_ALLOWED);
        }

        return self::verified($tmpPath, $filename, $maxBytes, $accept);
    }

    /** @param list<string> $accept */
    private static function verified(string $tmpPath, string $filename, int $maxBytes, array $accept): UploadedFile
    {
        // A missing file after a successful response means the sink couldn't be
        // written (permissions, full disk) — that's a download failure, not an
        // oversize condition, so the two cases must not share a branch.
        if (! is_file($tmpPath)) {
            throw new UrlFetchException(UrlFetchException::DOWNLOAD_FAILED);
        }

        if (filesize($tmpPath) > $maxBytes) {
            @unlink($tmpPath);
            throw new UrlFetchException(UrlFetchException::FILE_TOO_LARGE);
        }

        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($tmpPath);
        if (! MimePolicy::allows($mime, $accept)) {
            @unlink($tmpPath);
            throw new UrlFetchException(UrlFetchException::MIME_NOT_ALLOWED);
        }

        return new UploadedFile($tmpPath, $filename, $mime, test: true);
    }

    private static function hostAllowed(string $url): bool
    {
        /** @var list<string> $allowed */
        $allowed = (array) config('tbtop-admin.media.url_import.allowed_hosts', []);
        if ($allowed === []) {
            return true;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        foreach ($allowed as $pattern) {
            if (fnmatch(strtolower((string) $pattern), $host)) {
                return true;
            }
        }

        return false;
    }

    private static function timeout(): int
    {
        return (int) config('tbtop-admin.media.url_import.timeout', 30);
    }

    /**
     * tempnam()'s uniqueness only holds while the reserved file exists, so the
     * sink writes directly into it instead of a derived sibling path — the
     * placeholder is left on disk and removed by the caller's @unlink().
     */
    private static function tempPath(): string
    {
        $descriptor = tempnam(sys_get_temp_dir(), 'tbtop_media_');
        if ($descriptor === false) {
            throw new UrlFetchException(UrlFetchException::DOWNLOAD_FAILED);
        }

        return $descriptor;
    }

    private static function causedByOversize(Throwable $e): bool
    {
        for ($cur = $e; $cur !== null; $cur = $cur->getPrevious()) {
            if ($cur instanceof UrlFetchException && $cur->reason === UrlFetchException::FILE_TOO_LARGE) {
                return true;
            }
        }

        return false;
    }

    private static function filenameFromUrl(string $url): string
    {
        $basename = basename((string) parse_url($url, PHP_URL_PATH));
        $sanitized = preg_replace('/[^A-Za-z0-9._-]/', '_', $basename) ?? '';

        return $sanitized !== '' && str_contains($sanitized, '.')
            ? $sanitized
            : 'download_'.time().'.bin';
    }
}
