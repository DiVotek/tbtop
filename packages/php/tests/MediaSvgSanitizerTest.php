<?php

use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\SvgSanitizeException;
use Tbtop\Admin\Media\SvgSanitizer;

beforeEach(function () {
    Storage::fake('public');
});

it('strips scripts and event handlers from a stored svg', function () {
    $dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'
        .'<script>alert(2)</script><rect width="10" height="10" /></svg>';
    Storage::disk('public')->put('tbtop-media/dirty.svg', $dirty);

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/dirty.svg', 'logo.svg');

    $clean = (string) Storage::disk('public')->get('tbtop-media/dirty.svg');
    expect($clean)->not->toContain('<script')
        ->and($clean)->not->toContain('onload')
        ->and($clean)->not->toContain('alert')
        ->and($clean)->toContain('<rect');
});

it('sanitizes an svg even when the path/name hides it as html', function () {
    // The bypass: finfo classifies an html-wrapped scriptful svg as text/html,
    // so it lands on disk with a .html name. Content sniffing still catches it.
    $dirty = "<!-- logo -->\n<svg xmlns=\"http://www.w3.org/2000/svg\">"
        .'<script>alert(1)</script><rect width="10" height="10" /></svg>';
    Storage::disk('public')->put('tbtop-media/sneaky.html', $dirty);

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/sneaky.html', 'sneaky.html');

    $clean = (string) Storage::disk('public')->get('tbtop-media/sneaky.html');
    expect($clean)->not->toContain('<script')
        ->and($clean)->not->toContain('alert')
        ->and($clean)->toContain('<rect');
});

it('sanitizes by the svg extension when content sniffing is inconclusive', function () {
    Storage::disk('public')->put('tbtop-media/icon.svg', '<svg onload="alert(1)"></svg>');

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/icon.svg', 'icon.svg');

    expect(Storage::disk('public')->get('tbtop-media/icon.svg'))->not->toContain('onload');
});

it('leaves non-svg files untouched', function () {
    Storage::disk('public')->put('tbtop-media/photo.png', 'raw-png-bytes');

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/photo.png', 'photo.png');

    expect(Storage::disk('public')->get('tbtop-media/photo.png'))->toBe('raw-png-bytes');
});

it('rejects an unparseable text svg and removes it from disk', function () {
    Storage::disk('public')->put('tbtop-media/broken.svg', '<svg not xml at all <<<');

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/broken.svg', 'broken.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/broken.svg');
});

it('leaves a png stored under a .svg name untouched', function () {
    $png = base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
    Storage::disk('public')->put('tbtop-media/photo.svg', $png);

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/photo.svg', 'photo.svg');

    expect(Storage::disk('public')->get('tbtop-media/photo.svg'))->toBe($png);
});

it('rejects an svg carrying a NUL byte that hides a script and removes it from disk', function () {
    // The NUL is attacker-controlled: it defeats the plain-text `<svg` sniff in
    // looksLikeSvg() while `sanitize()` still fails to parse the payload, so
    // this must be refused rather than treated as an opaque binary passthrough.
    $dirty = '<svg xmlns="http://www.w3.org/2000/svg"><!-- '."\x00"
        .' --><script>alert(1)</script></svg>';
    Storage::disk('public')->put('tbtop-media/nul.svg', $dirty);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/nul.svg', 'nul.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/nul.svg');
});

it('rejects a gzip-compressed svgz and removes it from disk', function () {
    $gzipped = gzencode('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>');
    Storage::disk('public')->put('tbtop-media/icon.svgz', $gzipped);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/icon.svgz', 'icon.svgz'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/icon.svgz');
});
