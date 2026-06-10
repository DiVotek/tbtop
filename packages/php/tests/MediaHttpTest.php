<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;

beforeEach(function () {
    Storage::fake('public');
});

// ---- GET /admin/media ----

it('lists media in root folder', function () {
    Media::create(mediaRow());
    Media::create(mediaRow(['name' => 'second.jpg']));

    $this->getJson('/admin/media')->assertOk()
        ->assertJsonPath('total', 2)
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 24);
});

it('filters media by folder', function () {
    $folder = MediaFolder::create(['name' => 'docs']);
    Media::create(mediaRow(['folder_id' => $folder->id, 'name' => 'in-folder.png']));
    Media::create(mediaRow(['name' => 'root.png']));

    $response = $this->getJson('/admin/media?folder='.$folder->id)->assertOk();
    expect($response->json('total'))->toBe(1)
        ->and($response->json('data.0.name'))->toBe('in-folder.png');
});

it('filters root media when folder param is empty', function () {
    $folder = MediaFolder::create(['name' => 'docs']);
    Media::create(mediaRow(['folder_id' => $folder->id, 'name' => 'in-folder.png']));
    Media::create(mediaRow(['name' => 'root.png']));

    $response = $this->getJson('/admin/media')->assertOk();
    expect($response->json('total'))->toBe(1)
        ->and($response->json('data.0.name'))->toBe('root.png');
});

it('searches media by name', function () {
    Media::create(mediaRow(['name' => 'hero-image.png']));
    Media::create(mediaRow(['name' => 'footer-logo.png']));

    $response = $this->getJson('/admin/media?search=hero&folder=')->assertOk();
    expect($response->json('total'))->toBe(1);
});

it('paginates media results', function () {
    for ($i = 0; $i < 5; $i++) {
        Media::create(mediaRow(['name' => "img{$i}.png"]));
    }

    $response = $this->getJson('/admin/media?perPage=2&page=1')->assertOk();
    expect($response->json('total'))->toBe(5)
        ->and($response->json('data'))->toHaveCount(2);
});

// ---- POST /admin/media/upload ----

it('uploads an image and returns 201 MediaItem', function () {
    $file = UploadedFile::fake()->image('photo.png', 300, 200);

    $response = $this->postJson('/admin/media/upload', ['file' => $file]);
    $response->assertStatus(201);

    $data = $response->json();
    expect($data)->toHaveKey('id')
        ->and($data['name'])->toBe('photo.png')
        ->and($data['mime'])->toBe('image/png')
        ->and($data['folderId'])->toBeNull()
        ->and($data)->toHaveKey('url')
        ->and($data)->toHaveKey('sizes');

    expect(Media::count())->toBe(1);
});

it('upload generates conversions for configured profiles', function () {
    $file = UploadedFile::fake()->image('big.png', 600, 400);

    $data = $this->postJson('/admin/media/upload', ['file' => $file])
        ->assertStatus(201)->json();

    expect($data['sizes'])->toHaveKey('thumb');
});

it('upload assigns folder when folderId provided', function () {
    $folder = MediaFolder::create(['name' => 'banners']);
    $file = UploadedFile::fake()->image('banner.png', 100, 100);

    $data = $this->postJson('/admin/media/upload', ['file' => $file, 'folderId' => $folder->id])
        ->assertStatus(201)->json();

    expect($data['folderId'])->toBe($folder->id);
});

it('upload rejects disallowed mime type', function () {
    $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

    $this->postJson('/admin/media/upload', ['file' => $file])->assertStatus(422);
});

it('upload rejects oversized file', function () {
    // max_size in KB → 10240 KB = 10 MB; create a file larger than that
    $file = UploadedFile::fake()->create('huge.png', 11000, 'image/png');

    $this->postJson('/admin/media/upload', ['file' => $file])->assertStatus(422);
});

// ---- POST /admin/media/import-url ----

it('import-url blocks private ip', function (string $url) {
    $response = $this->postJson('/admin/media/import-url', ['url' => $url]);
    $response->assertStatus(422);
    expect($response->json('message'))->toContain('blocked');
})->with([
    'http://127.0.0.1/malicious',
    'http://192.168.1.100/secret',
    'http://10.0.0.1/internal',
    'http://localhost/admin',
]);

it('import-url blocks non-http scheme', function (string $url) {
    $this->postJson('/admin/media/import-url', ['url' => $url])->assertStatus(422);
})->with([
    'ftp://example.com/file.png',
    'file:///etc/passwd',
]);

it('import-url returns 201 MediaItem on success', function () {
    // Use a 1x1 PNG blob as the fake response body so finfo detects image/png.
    $pngBlob = base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );

    // 8.8.8.8 is a public IP — SsrfGuard lets it through as a literal.
    // Http::fake intercepts the Guzzle request before any real network call.
    Http::fake([
        '*' => Http::response($pngBlob, 200, ['Content-Type' => 'image/png']),
    ]);

    $response = $this->postJson('/admin/media/import-url', [
        'url' => 'https://8.8.8.8/photo.png',
        'name' => 'my-photo',
    ]);

    $response->assertStatus(201);
    expect($response->json('name'))->toBe('my-photo');
});

it('import-url reports download_failed on non-2xx response', function () {
    Http::fake(['*' => Http::response('Not Found', 404)]);

    $response = $this->postJson('/admin/media/import-url', [
        'url' => 'https://8.8.8.8/missing.png',
    ]);

    $response->assertStatus(422);
    expect($response->json('message'))->toContain('download');
});

it('import-url reports mime_not_allowed on disallowed content-type', function () {
    Http::fake([
        '*' => Http::response(
            'fake content',
            200,
            ['Content-Type' => 'application/zip'],
        ),
    ]);

    $response = $this->postJson('/admin/media/import-url', [
        'url' => 'https://8.8.8.8/archive.zip',
    ]);

    $response->assertStatus(422);
});

// ---- PATCH /admin/media/{id} ----

it('updates media name, alt and folderId', function () {
    $media = Media::create(mediaRow());
    $folder = MediaFolder::create(['name' => 'new-folder']);

    $response = $this->patchJson("/admin/media/{$media->id}", [
        'name' => 'renamed.png',
        'alt' => 'A nice photo',
        'folderId' => $folder->id,
    ])->assertOk();

    expect($response->json('name'))->toBe('renamed.png')
        ->and($response->json('alt'))->toBe('A nice photo')
        ->and($response->json('folderId'))->toBe($folder->id);
});

it('patch returns 404 for unknown media', function () {
    $this->patchJson('/admin/media/9999', ['name' => 'x'])->assertNotFound();
});

// ---- POST /admin/media/{id}/replace ----

it('replace deletes old files and stores new upload', function () {
    $oldFile = UploadedFile::fake()->image('old.png', 100, 100);
    $media = Media::create(mediaRow(['path' => 'tbtop-media/old.png']));
    Storage::disk('public')->put('tbtop-media/old.png', 'old content');

    $newFile = UploadedFile::fake()->image('new.png', 200, 200);

    $response = $this->post("/admin/media/{$media->id}/replace", ['file' => $newFile])
        ->assertOk();

    expect($response->json('mime'))->toBe('image/png')
        ->and($response->json('name'))->toBe('new.png');

    Storage::disk('public')->assertMissing('tbtop-media/old.png');
});

it('replace rejects disallowed mime', function () {
    $media = Media::create(mediaRow());
    $file = UploadedFile::fake()->create('hack.exe', 10, 'application/octet-stream');

    $this->post("/admin/media/{$media->id}/replace", ['file' => $file])->assertStatus(422);
});

// ---- DELETE /admin/media/{id} ----

it('delete removes media record and files from disk', function () {
    Storage::disk('public')->put('tbtop-media/photo.png', 'content');
    Storage::disk('public')->put('tbtop-media/photo-thumb.png', 'thumb content');

    $media = Media::create(mediaRow([
        'path' => 'tbtop-media/photo.png',
        'sizes' => ['thumb' => 'tbtop-media/photo-thumb.png'],
    ]));

    $this->deleteJson("/admin/media/{$media->id}")->assertNoContent();

    expect(Media::count())->toBe(0);
    Storage::disk('public')->assertMissing('tbtop-media/photo.png');
    Storage::disk('public')->assertMissing('tbtop-media/photo-thumb.png');
});

it('delete returns 404 for unknown media', function () {
    $this->deleteJson('/admin/media/9999')->assertNotFound();
});

// ---- GET /admin/media/folders ----

it('lists all folders flat', function () {
    $parent = MediaFolder::create(['name' => 'Parent']);
    MediaFolder::create(['name' => 'Child', 'parent_id' => $parent->id]);

    $data = $this->getJson('/admin/media/folders')->assertOk()->json();
    expect($data)->toHaveCount(2);
});

// ---- POST /admin/media/folders ----

it('creates a folder', function () {
    $response = $this->postJson('/admin/media/folders', ['name' => 'My Folder'])
        ->assertStatus(201);

    expect($response->json('name'))->toBe('My Folder')
        ->and($response->json('parentId'))->toBeNull();
    expect(MediaFolder::count())->toBe(1);
});

it('creates a nested folder', function () {
    $parent = MediaFolder::create(['name' => 'Root']);

    $response = $this->postJson('/admin/media/folders', [
        'name' => 'Sub',
        'parentId' => $parent->id,
    ])->assertStatus(201);

    expect($response->json('parentId'))->toBe($parent->id);
});

// ---- PATCH /admin/media/folders/{id} ----

it('renames a folder', function () {
    $folder = MediaFolder::create(['name' => 'Old Name']);

    $response = $this->patchJson("/admin/media/folders/{$folder->id}", ['name' => 'New Name'])
        ->assertOk();

    expect($response->json('name'))->toBe('New Name');
});

// ---- DELETE /admin/media/folders/{id} ----

it('deletes an empty folder', function () {
    $folder = MediaFolder::create(['name' => 'empty']);

    $this->deleteJson("/admin/media/folders/{$folder->id}")->assertNoContent();
    expect(MediaFolder::count())->toBe(0);
});

it('returns 409 when folder has media', function () {
    $folder = MediaFolder::create(['name' => 'with-files']);
    Media::create(mediaRow(['folder_id' => $folder->id]));

    $this->deleteJson("/admin/media/folders/{$folder->id}")->assertStatus(409);
});

it('returns 409 when folder has sub-folders', function () {
    $parent = MediaFolder::create(['name' => 'parent']);
    MediaFolder::create(['name' => 'child', 'parent_id' => $parent->id]);

    $this->deleteJson("/admin/media/folders/{$parent->id}")->assertStatus(409);
});

// ---- helpers ----

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function mediaRow(array $overrides = []): array
{
    return array_merge([
        'folder_id' => null,
        'name' => 'photo.png',
        'disk' => 'public',
        'path' => 'tbtop-media/photo.png',
        'mime' => 'image/png',
        'size' => 1024,
        'sizes' => [],
        'alt' => null,
    ], $overrides);
}
