<?php

namespace Tbtop\Admin\Media;

/**
 * Default-deny SSRF guard. Public IPv4/IPv6 resolved via DNS is the only
 * accept path — anything ambiguous (unresolvable host, private range,
 * non-standard IP encoding, .local/.localhost TLD) is blocked.
 */
final class SsrfGuard
{
    private const ALLOWED_SCHEMES = ['http', 'https'];

    /**
     * Returns true when the URL must be blocked.
     */
    public static function isBlocked(string $url): bool
    {
        $parts = parse_url($url);

        if (! is_array($parts)) {
            return true;
        }

        $scheme = isset($parts['scheme']) ? strtolower((string) $parts['scheme']) : '';
        if (! in_array($scheme, self::ALLOWED_SCHEMES, true)) {
            return true;
        }

        $host = (string) ($parts['host'] ?? '');
        if ($host === '') {
            return true;
        }

        $host = self::normalizeHost($host);
        if ($host === null) {
            return true;
        }

        if (self::isLiteralIp($host)) {
            return ! self::isPublicIp($host);
        }

        if (self::isSuspiciousHostname($host)) {
            return true;
        }

        return ! self::resolvesToPublicIp($host);
    }

    /**
     * Returns a Guzzle curl option array that pins DNS for the given URL to the
     * IP we validated, closing the TOCTOU gap between isBlocked() and the
     * actual request. Returns [] when the host cannot be pinned.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function pinnedDnsCurlOption(string $url): array
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return [];
        }

        $ip = self::resolvePinnedIp($host);
        if ($ip === null) {
            return [];
        }

        $port = parse_url($url, PHP_URL_PORT);
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $port = is_int($port) ? $port : ($scheme === 'https' ? 443 : 80);

        return [
            'curl' => [
                CURLOPT_RESOLVE => ["{$host}:{$port}:{$ip}"],
            ],
        ];
    }

    /**
     * Resolve the host to a public IP once for DNS-pinning. Returns null if
     * the host can't be resolved or resolves to a non-public address.
     */
    public static function resolvePinnedIp(string $host): ?string
    {
        $host = self::normalizeHost($host);
        if ($host === null) {
            return null;
        }

        if (self::isLiteralIp($host)) {
            return self::isPublicIp($host) ? $host : null;
        }

        foreach (self::resolveAll($host) as $ip) {
            if (self::isPublicIp($ip)) {
                return $ip;
            }
        }

        return null;
    }

    private static function normalizeHost(string $host): ?string
    {
        $host = trim($host, '[]');
        $host = strtolower($host);

        if ($host === '' || $host === 'localhost') {
            return null;
        }

        if (str_ends_with($host, '.local') || str_ends_with($host, '.localhost')) {
            return null;
        }

        return $host;
    }

    private static function isLiteralIp(string $host): bool
    {
        return filter_var($host, FILTER_VALIDATE_IP) !== false;
    }

    private static function isPublicIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) !== false;
    }

    /**
     * Reject hostnames that look like non-standard IP encodings (hex, octal,
     * decimal integer). A legitimate hostname contains at least one letter
     * outside hex digits; a legitimate dotted IPv4 passes isLiteralIp().
     */
    private static function isSuspiciousHostname(string $host): bool
    {
        if (preg_match('/^0x[0-9a-f]+$/i', $host) === 1) {
            return true;
        }

        if (preg_match('/^[0-9]+$/', $host) === 1) {
            return true;
        }

        if (str_contains($host, '.') && preg_match('/^[0-9a-fx.]+$/i', $host) === 1) {
            return ! self::isLiteralIp($host);
        }

        return false;
    }

    private static function resolvesToPublicIp(string $host): bool
    {
        $ips = self::resolveAll($host);

        if ($ips === []) {
            return false;
        }

        foreach ($ips as $ip) {
            if (! self::isPublicIp($ip)) {
                return false;
            }
        }

        return true;
    }

    /** @return list<string> */
    private static function resolveAll(string $host): array
    {
        $records = @dns_get_record($host, DNS_A + DNS_AAAA);

        if ($records === false || $records === []) {
            return [];
        }

        $ips = [];
        foreach ($records as $record) {
            if (isset($record['ip']) && is_string($record['ip'])) {
                $ips[] = $record['ip'];
            } elseif (isset($record['ipv6']) && is_string($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }

        return $ips;
    }
}
