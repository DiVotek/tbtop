<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Uploads\ConversionProfile;

beforeEach(function () {
    Storage::fake('public');
});

/** Stores an image on the fake disk with a Media row, as an upload under older profiles would. */
function storedMedia(int $width, int $height, array $sizes = []): Media
{
    $path = (string) UploadedFile::fake()->image('photo.png', $width, $height)->store('tbtop-media', 'public');

    return Media::create([
        'name' => 'photo.png', 'disk' => 'public', 'path' => $path, 'mime' => 'image/png',
        'size' => 1, 'width' => $width, 'height' => $height, 'sizes' => $sizes,
    ]);
}

it('reads a width-only profile as responsive and keeps the box form bounded', function () {
    $profiles = ConversionProfile::fromConfig(['profiles' => [
        'thumb' => [320, 320],
        'sm' => [640],
        'lg' => ['width' => 1600, 'format' => 'jpeg'],
    ]]);

    expect($profiles['thumb']->isResponsive())->toBeFalse()
        ->and($profiles['sm']->isResponsive())->toBeTrue()
        ->and($profiles['sm']->maxHeight)->toBeNull()
        ->and($profiles['lg']->isResponsive())->toBeTrue()
        ->and($profiles['lg']->format)->toBe('jpeg');
});

it('ships webp responsive defaults of 640, 1024 and 1600 next to the thumb', function () {
    $config = require __DIR__.'/../config/tbtop-admin.php';

    expect($config['media']['profiles'])->toBe([
        'thumb' => [320, 320],
        'sm' => [640],
        'md' => [1024],
        'lg' => [1600],
    ]);
});

it('upload makes responsive variants bounded by width only and skips those wider than the image', function () {
    config()->set('tbtop-admin.media.profiles', ['thumb' => [128, 128], 'sm' => [300], 'lg' => [1600]]);
    $file = UploadedFile::fake()->image('tall.png', 600, 1200);

    $data = $this->postJson('/admin/api/media/upload', ['file' => $file])->assertStatus(201)->json();

    expect($data['sizes']['sm'])->toMatchArray(['width' => 300, 'height' => 600, 'mime' => 'image/webp'])
        ->and($data['sizes'])->not->toHaveKey('lg')
        ->and($data['sizes']['thumb'])->toMatchArray(['width' => 64, 'height' => 128]);
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');

it('regenerates only the variants a stored media item lacks', function () {
    $media = storedMedia(800, 400);
    $old = $media->sizes;
    config()->set('tbtop-admin.media.profiles', ['thumb' => [128, 128], 'sm' => [400], 'xl' => [2000]]);
    $this->artisan('tbtop:media-regenerate')->assertSuccessful();
    $first = $media->fresh()->sizes;

    expect($old)->toBe([])
        ->and($first['thumb'])->toMatchArray(['width' => 128, 'height' => 64, 'mime' => 'image/webp'])
        ->and($first['sm'])->toMatchArray(['width' => 400, 'height' => 200])
        ->and($first)->not->toHaveKey('xl')
        ->and(Storage::disk('public')->exists($first['sm']['path']))->toBeTrue();

    Storage::disk('public')->put($first['thumb']['path'], 'kept');
    $this->artisan('tbtop:media-regenerate')->assertSuccessful();

    expect(Storage::disk('public')->get($first['thumb']['path']))->toBe('kept');
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');

it('rebuilds existing variants with --force and deletes files the new set no longer uses', function () {
    $media = storedMedia(800, 400);
    $this->artisan('tbtop:media-regenerate')->assertSuccessful();
    $before = $media->fresh()->sizes['thumb']['path'];
    config()->set('tbtop-admin.media.profiles', ['thumb' => ['width' => 128, 'height' => 128, 'format' => 'jpeg']]);

    $this->artisan('tbtop:media-regenerate', ['--force' => true])->assertSuccessful();
    $after = $media->fresh()->sizes['thumb'];

    expect($after['path'])->toEndWith('-thumb.jpg')
        ->and($after['mime'])->toBe('image/jpeg')
        ->and(Storage::disk('public')->exists($after['path']))->toBeTrue()
        ->and(Storage::disk('public')->exists($before))->toBeFalse();
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');

it('limits regeneration to the named profiles and refuses an unknown one', function () {
    $media = storedMedia(800, 400);
    config()->set('tbtop-admin.media.profiles', ['thumb' => [128, 128], 'sm' => [400]]);

    $this->artisan('tbtop:media-regenerate', ['--profile' => ['sm']])->assertSuccessful();
    expect(array_keys($media->fresh()->sizes))->toBe(['sm']);

    $this->artisan('tbtop:media-regenerate', ['--profile' => ['huge']])
        ->expectsOutputToContain('Unknown profile(s): huge')
        ->assertFailed();
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');

it('skips svg and media whose original is missing, and still processes the rest', function () {
    $svg = Media::create([
        'name' => 'logo.svg', 'disk' => 'public', 'path' => 'tbtop-media/logo.svg', 'mime' => 'image/svg+xml',
        'size' => 1, 'sizes' => [],
    ]);
    Storage::disk('public')->put('tbtop-media/logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    $gone = Media::create([
        'name' => 'gone.png', 'disk' => 'public', 'path' => 'tbtop-media/gone.png', 'mime' => 'image/png',
        'size' => 1, 'sizes' => [],
    ]);
    $ok = storedMedia(800, 400);

    $this->artisan('tbtop:media-regenerate')->assertSuccessful();

    expect($svg->fresh()->sizes)->toBe([])
        ->and($gone->fresh()->sizes)->toBe([])
        ->and($ok->fresh()->sizes)->toHaveKey('thumb');
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');
