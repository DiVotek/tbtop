<?php

use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\SvgSanitizer;

beforeEach(function () {
    Storage::fake('public');
});

it('strips scripts and event handlers from a stored svg', function () {
    $dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'
        .'<script>alert(2)</script><rect width="10" height="10" /></svg>';
    Storage::disk('public')->put('tbtop-media/dirty.svg', $dirty);

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/dirty.svg', 'image/svg+xml');

    $clean = (string) Storage::disk('public')->get('tbtop-media/dirty.svg');
    expect($clean)->not->toContain('<script')
        ->and($clean)->not->toContain('onload')
        ->and($clean)->not->toContain('alert')
        ->and($clean)->toContain('<rect');
});

it('leaves non-svg files untouched', function () {
    Storage::disk('public')->put('tbtop-media/photo.png', 'raw-png-bytes');

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/photo.png', 'image/png');

    expect(Storage::disk('public')->get('tbtop-media/photo.png'))->toBe('raw-png-bytes');
});

it('overwrites unparseable svg with a safe empty svg', function () {
    Storage::disk('public')->put('tbtop-media/broken.svg', 'not xml at all <<<');

    SvgSanitizer::sanitizeStored('public', 'tbtop-media/broken.svg', 'image/svg+xml');

    $result = (string) Storage::disk('public')->get('tbtop-media/broken.svg');
    expect($result)->toContain('<svg')
        ->and($result)->not->toContain('not xml at all');
});
