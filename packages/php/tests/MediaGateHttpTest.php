<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;

// GatedMediaPanel declares ->mediaGate('manage-media').

beforeEach(function () {
    Storage::fake('public');
    Storage::disk('public')->put('tbtop-media/photo.png', 'original');
    $this->media = Media::create([
        'folder_id' => null,
        'name' => 'photo.png',
        'disk' => 'public',
        'path' => 'tbtop-media/photo.png',
        'mime' => 'image/png',
        'size' => 1024,
        'sizes' => [],
        'alt' => null,
    ]);
});

it('refuses every media-manager call to a user who fails the panel media gate', function () {
    Gate::define('manage-media', fn () => false);
    $id = $this->media->id;

    $this->getJson('/admin/api/media')->assertForbidden();
    $this->postJson('/admin/api/media/upload', ['file' => UploadedFile::fake()->image('new.png')])
        ->assertForbidden();
    $this->postJson("/admin/api/media/{$id}/replace", ['file' => UploadedFile::fake()->image('swap.png')])
        ->assertForbidden();
    $this->deleteJson("/admin/api/media/{$id}")->assertForbidden();
    $this->postJson('/admin/api/media/folders', ['name' => 'docs'])->assertForbidden();

    expect(Media::count())->toBe(1)
        ->and(Media::find($id)->path)->toBe('tbtop-media/photo.png')
        ->and(MediaFolder::count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe(['tbtop-media/photo.png'])
        ->and(Storage::disk('public')->get('tbtop-media/photo.png'))->toBe('original');
});

it('lets a user who passes the panel media gate delete media', function () {
    Gate::define('manage-media', fn () => true);

    $this->deleteJson("/admin/api/media/{$this->media->id}")->assertNoContent();

    expect(Media::count())->toBe(0);
    Storage::disk('public')->assertMissing('tbtop-media/photo.png');
});

it('puts every media-manager route behind the gate', function () {
    $media = collect(app('router')->getRoutes()->getRoutes())
        ->filter(fn ($route) => str_contains((string) $route->getName(), '.media.'));

    // index, upload, import-url, show, download, update, replace, destroy, 4 folder routes
    expect($media)->toHaveCount(12)
        ->and($media->reject(fn ($route) => in_array('can:manage-media', $route->gatherMiddleware(), true)))->toBeEmpty();
});
