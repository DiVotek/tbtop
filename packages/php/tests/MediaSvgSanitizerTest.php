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

it('rejects a scriptful svg disguised behind a bare BM prefix and removes it from disk', function () {
    // The two-byte "BM" prefix is also the start of an unparseable svg
    // payload; a real BMP header check must not mistake this for raster
    // passthrough or the script ships to the public disk untouched.
    $dirty = 'BM<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    Storage::disk('public')->put('tbtop-media/fake-bmp.svg', $dirty);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/fake-bmp.svg', 'fake-bmp.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/fake-bmp.svg');
});

it('rejects a scriptful svg disguised behind a jpeg signature and removes it from disk', function () {
    // The bypass this closes: a JPEG magic-byte prefix used to be enough to
    // trigger a raster passthrough, letting an unparseable payload with a
    // live <script> ship to the public disk untouched under a .svg name.
    $dirty = "\xFF\xD8\xFF".'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    Storage::disk('public')->put('tbtop-media/fake-jpeg.svg', $dirty);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/fake-jpeg.svg', 'fake-jpeg.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/fake-jpeg.svg');
});

it('rejects a scriptful svg disguised behind a gif signature and removes it from disk', function () {
    $dirty = 'GIF89a'.'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    Storage::disk('public')->put('tbtop-media/fake-gif.svg', $dirty);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/fake-gif.svg', 'fake-gif.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/fake-gif.svg');
});

it('rejects a real png stored under a .svg name and removes it from disk', function () {
    // A genuine raster upload under the wrong extension is no longer
    // recovered: distinguishing "real raster" from "polyglot attack" by
    // content sniffing alone is the exact rule that kept getting bypassed.
    $image = imagecreatetruecolor(2, 2);
    ob_start();
    imagepng($image);
    $png = ob_get_clean();
    imagedestroy($image);

    Storage::disk('public')->put('tbtop-media/real.svg', $png);

    expect(fn () => SvgSanitizer::sanitizeStored('public', 'tbtop-media/real.svg', 'real.svg'))
        ->toThrow(SvgSanitizeException::class);

    Storage::disk('public')->assertMissing('tbtop-media/real.svg');
});
