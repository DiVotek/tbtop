<?php

use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Tests\TestCase;
use Tbtop\Admin\Uploads\UploadFieldUrl;

uses(TestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    Storage::fake('local');
    config()->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
});

/** Run applyToRecord for one field + record, return the rewritten field value. */
function normalize(array $record, Upload $field, string $name): mixed
{
    $out = UploadFieldUrl::applyToRecord($record, [$field], 'upload-render-page');

    return $out[$name];
}

it('Normalize: a single string disk-path on a public field becomes a /storage envelope', function (): void {
    $field = (new Upload('doc'))->disk('public')->directory('docs')->visibility('public');

    $value = normalize(['doc' => 'docs/sample.webp'], $field, 'doc');

    expect($value)->toBeArray();
    expect($value['path'])->toBe('docs/sample.webp');
    expect($value['filename'])->toBe('sample.webp');
    expect($value['url'])->toStartWith('/storage')->not->toContain('signature=');
});

// The private-disk signed-url case needs the page-scoped `*.uploadView` route,
// which only exists through panel/page wiring — covered at the HTTP boundary in
// FieldUploadRenderTest, not here (this is a pure applyToRecord unit test).

it('Normalize: a string that is already a full URL is used as-is, not disk-resolved', function (): void {
    $field = (new Upload('cover_url'))->disk('public')->directory('covers')->visibility('public');
    $url = 'https://picsum.photos/seed/hello/80';

    $value = normalize(['cover_url' => $url], $field, 'cover_url');

    expect($value['url'])->toBe($url);
    expect($value['url'])->not->toContain('/storage/https');
    expect($value['path'])->toBe($url);
    expect($value['filename'])->toBe('80');
});

it('Normalize: a string starting with a leading slash is used as-is', function (): void {
    $field = (new Upload('cover_url'))->disk('public')->directory('covers')->visibility('public');

    $value = normalize(['cover_url' => '/already/served.png'], $field, 'cover_url');

    expect($value['url'])->toBe('/already/served.png');
    expect($value['url'])->not->toContain('/storage//already');
});

it('Normalize: a multiple field maps each string element into an envelope', function (): void {
    $field = (new Upload('gallery'))->disk('public')->directory('gallery')->visibility('public')->multiple();

    $value = normalize(['gallery' => ['gallery/a.webp', 'gallery/b.webp']], $field, 'gallery');

    expect($value)->toHaveCount(2);
    expect($value[0]['path'])->toBe('gallery/a.webp');
    expect($value[0]['filename'])->toBe('a.webp');
    expect($value[0]['url'])->toStartWith('/storage');
    expect($value[1]['path'])->toBe('gallery/b.webp');
});

it('Normalize: a non-string element in a multiple field passes through unchanged', function (): void {
    $field = (new Upload('gallery'))->disk('public')->directory('gallery')->visibility('public')->multiple();
    $envelope = ['path' => 'gallery/c.webp', 'url' => '/storage/gallery/c.webp', 'filename' => 'c.webp'];

    $value = normalize(['gallery' => ['gallery/a.webp', $envelope]], $field, 'gallery');

    expect($value[0]['path'])->toBe('gallery/a.webp');
    expect($value[1])->toBe($envelope);
});

it('Normalize: an existing array-with-path envelope keeps resolving as before', function (): void {
    $field = (new Upload('doc'))->disk('public')->directory('docs')->visibility('public');
    $record = ['doc' => ['path' => 'docs/sample.webp', 'filename' => 'public.webp']];

    $value = normalize($record, $field, 'doc');

    expect($value['filename'])->toBe('public.webp');
    expect($value['url'])->toStartWith('/storage');
});

it('Normalize: a null value stays null', function (): void {
    $field = (new Upload('doc'))->disk('public')->directory('docs')->visibility('public');

    expect(normalize(['doc' => null], $field, 'doc'))->toBeNull();
});
