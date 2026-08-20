<?php

use Illuminate\Support\Facades\Http;
use Tbtop\Admin\Media\SsrfGuard;
use Tbtop\Admin\Media\UrlFetcher;
use Tbtop\Admin\Media\UrlFetchException;

// ------- blocked: scheme -------

it('blocks non-http schemes', function (string $url) {
    expect(SsrfGuard::isBlocked($url))->toBeTrue();
})->with([
    'ftp://example.com/file.txt',
    'file:///etc/passwd',
    'gopher://example.com/',
    'data:text/html,<h1>hi</h1>',
]);

// ------- blocked: private / reserved IPv4 -------

it('blocks private ipv4 literals', function (string $url) {
    expect(SsrfGuard::isBlocked($url))->toBeTrue();
})->with([
    'http://10.0.0.1/foo',
    'http://172.16.0.1/foo',
    'http://192.168.1.1/foo',
    'http://127.0.0.1/foo',
    'http://0.0.0.0/foo',
]);

// ------- blocked: localhost / .local -------

it('blocks localhost and .local hostnames', function (string $url) {
    expect(SsrfGuard::isBlocked($url))->toBeTrue();
})->with([
    'http://localhost/admin',
    'http://myapp.local/secret',
    'http://service.localhost/api',
]);

// ------- blocked: suspicious non-standard encodings -------

it('blocks suspicious non-standard ip encodings', function (string $url) {
    expect(SsrfGuard::isBlocked($url))->toBeTrue();
})->with([
    'http://0x7f000001/foo',       // hex 127.0.0.1
    'http://2130706433/foo',       // decimal 127.0.0.1
]);

// ------- blocked: empty / malformed -------

it('blocks empty or malformed urls', function (string $url) {
    expect(SsrfGuard::isBlocked($url))->toBeTrue();
})->with([
    '',
    'not-a-url',
    '//no-scheme.example.com',
]);

// ------- resolvePinnedIp: literal private IP returns null -------

it('resolvePinnedIp returns null for private ip literals', function (string $host) {
    expect(SsrfGuard::resolvePinnedIp($host))->toBeNull();
})->with([
    '10.0.0.1',
    '192.168.0.1',
    '127.0.0.1',
    'localhost',
]);

// ------- resolvePinnedIp: public literal IP is returned as-is -------

it('resolvePinnedIp returns the ip for a public literal', function () {
    expect(SsrfGuard::resolvePinnedIp('8.8.8.8'))->toBe('8.8.8.8');
});

// ------- pinnedDnsCurlOption: private host returns empty -------

it('pinnedDnsCurlOption returns empty array for private host', function () {
    expect(SsrfGuard::pinnedDnsCurlOption('http://127.0.0.1/foo'))->toBe([]);
});

it('pinnedDnsCurlOption validates and pins a public literal', function () {
    expect(SsrfGuard::pinnedDnsCurlOption('https://8.8.8.8/foo'))->toBe([
        'curl' => [CURLOPT_RESOLVE => ['8.8.8.8:443:8.8.8.8']],
    ]);
});

it('pinnedDnsCurlOption rejects an unsafe url before a request can be made', function (string $url) {
    expect(SsrfGuard::pinnedDnsCurlOption($url))->toBe([]);
})->with([
    'file:///etc/passwd',
    'http://2130706433/foo',
    'http://localhost/admin',
]);

it('does not send a request when dns pinning fails', function () {
    Http::fake();

    try {
        UrlFetcher::fetch('http://127.0.0.1/file.png', []);
        $this->fail('Expected the URL to be blocked.');
    } catch (UrlFetchException $e) {
        expect($e->reason)->toBe(UrlFetchException::BLOCKED_URL);
    }

    Http::assertNothingSent();
});
