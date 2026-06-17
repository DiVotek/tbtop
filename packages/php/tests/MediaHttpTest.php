<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Media\Models\Media;
use Tbtop\Admin\Media\Models\MediaFolder;

beforeEach(function () {
    Storage::fake('public');
});

// ---- GET /admin/api/media ----

it('lists media in root folder', function () {
    Media::create(mediaRow());
    Media::create(mediaRow(['name' => 'second.jpg']));

    $this->getJson('/admin/api/media')->assertOk()
        ->assertJsonPath('total', 2)
        ->assertJsonPath('page', 1)
        ->assertJsonPath('perPage', 24);
});

it('filters media by folder', function () {
    $folder = MediaFolder::create(['name' => 'docs']);
    Media::create(mediaRow(['folder_id' => $folder->id, 'name' => 'in-folder.png']));
    Media::create(mediaRow(['name' => 'root.png']));

    $response = $this->getJson('/admin/api/media?folder='.$folder->id)->assertOk();
    expect($response->json('total'))->toBe(1)
        ->and($response->json('data.0.name'))->toBe('in-folder.png');
});

it('filters root media when folder param is empty', function () {
    $folder = MediaFolder::create(['name' => 'docs']);
    Media::create(mediaRow(['folder_id' => $folder->id, 'name' => 'in-folder.png']));
    Media::create(mediaRow(['name' => 'root.png']));

    $response = $this->getJson('/admin/api/media')->assertOk();
    expect($response->json('total'))->toBe(1)
        ->and($response->json('data.0.name'))->toBe('root.png');
});

it('searches media by name', function () {
    Media::create(mediaRow(['name' => 'hero-image.png']));
    Media::create(mediaRow(['name' => 'footer-logo.png']));

    $response = $this->getJson('/admin/api/media?search=hero&folder=')->assertOk();
    expect($response->json('total'))->toBe(1);
});

it('paginates media results', function () {
    for ($i = 0; $i < 5; $i++) {
        Media::create(mediaRow(['name' => "img{$i}.png"]));
    }

    $response = $this->getJson('/admin/api/media?perPage=2&page=1')->assertOk();
    expect($response->json('total'))->toBe(5)
        ->and($response->json('data'))->toHaveCount(2);
});

// ---- POST /admin/api/media/upload ----

it('uploads an image and returns 201 MediaItem', function () {
    $file = UploadedFile::fake()->image('photo.png', 300, 200);

    $response = $this->postJson('/admin/api/media/upload', ['file' => $file]);
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

    $data = $this->postJson('/admin/api/media/upload', ['file' => $file])
        ->assertStatus(201)->json();

    expect($data['sizes'])->toHaveKey('thumb');
});

it('upload assigns folder when folderId provided', function () {
    $folder = MediaFolder::create(['name' => 'banners']);
    $file = UploadedFile::fake()->image('banner.png', 100, 100);

    $data = $this->postJson('/admin/api/media/upload', ['file' => $file, 'folderId' => $folder->id])
        ->assertStatus(201)->json();

    expect($data['folderId'])->toBe($folder->id);
});

it('upload sanitizes svg by stripping scripts and event handlers', function () {
    $dirty = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">'
        .'<script>alert(2)</script><rect width="10" height="10" /></svg>';
    $file = UploadedFile::fake()->createWithContent('logo.svg', $dirty);

    $this->postJson('/admin/api/media/upload', ['file' => $file])
        ->assertStatus(201);

    $stored = Storage::disk('public')->get((string) Media::firstOrFail()->path);
    expect($stored)->not->toContain('<script')
        ->and($stored)->not->toContain('onload')
        ->and($stored)->not->toContain('alert');
});

it('upload keeps a clean svg intact and succeeds', function () {
    $clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
        .'<rect width="10" height="10" /></svg>';
    $file = UploadedFile::fake()->createWithContent('clean.svg', $clean);

    $this->postJson('/admin/api/media/upload', ['file' => $file])
        ->assertStatus(201);

    $stored = Storage::disk('public')->get((string) Media::firstOrFail()->path);
    expect($stored)->toContain('<svg')
        ->and($stored)->toContain('<rect');
});

it('replace sanitizes a replacement svg', function () {
    $media = Media::create(mediaRow(['path' => 'tbtop-media/old.svg', 'mime' => 'image/svg+xml']));
    Storage::disk('public')->put('tbtop-media/old.svg', '<svg></svg>');

    $dirty = '<svg xmlns="http://www.w3.org/2000/svg">'
        .'<script>alert(1)</script><rect /></svg>';
    $file = UploadedFile::fake()->createWithContent('new.svg', $dirty);

    $media->refresh();
    $this->post("/admin/api/media/{$media->id}/replace", ['file' => $file])
        ->assertOk();

    $stored = Storage::disk('public')->get($media->refresh()->path);
    expect($stored)->not->toContain('<script')
        ->and($stored)->not->toContain('alert');
});

it('upload rejects disallowed mime type', function () {
    $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

    $this->postJson('/admin/api/media/upload', ['file' => $file])->assertStatus(422);
});

it('upload rejects oversized file', function () {
    // max_size in KB → 10240 KB = 10 MB; create a file larger than that
    $file = UploadedFile::fake()->create('huge.png', 11000, 'image/png');

    $this->postJson('/admin/api/media/upload', ['file' => $file])->assertStatus(422);
});

// ---- POST /admin/api/media/import-url ----

it('import-url blocks private ip', function (string $url) {
    $response = $this->postJson('/admin/api/media/import-url', ['url' => $url]);
    $response->assertStatus(422);
    expect($response->json('message'))->toContain('blocked');
})->with([
    'http://127.0.0.1/malicious',
    'http://192.168.1.100/secret',
    'http://10.0.0.1/internal',
    'http://localhost/admin',
]);

it('import-url blocks non-http scheme', function (string $url) {
    $this->postJson('/admin/api/media/import-url', ['url' => $url])->assertStatus(422);
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

    $response = $this->postJson('/admin/api/media/import-url', [
        'url' => 'https://8.8.8.8/photo.png',
        'name' => 'my-photo',
    ]);

    $response->assertStatus(201);
    expect($response->json('name'))->toBe('my-photo');
});

it('import-url reports download_failed on non-2xx response', function () {
    Http::fake(['*' => Http::response('Not Found', 404)]);

    $response = $this->postJson('/admin/api/media/import-url', [
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

    $response = $this->postJson('/admin/api/media/import-url', [
        'url' => 'https://8.8.8.8/archive.zip',
    ]);

    $response->assertStatus(422);
});

// ---- GET /admin/api/media/{id} ----

it('returns a single media item by id', function () {
    $media = Media::create(mediaRow(['name' => 'single.png']));

    $response = $this->getJson("/admin/api/media/{$media->id}")->assertOk();

    expect($response->json('id'))->toBe($media->id)
        ->and($response->json('name'))->toBe('single.png')
        ->and($response->json('mime'))->toBe('image/png');
});

it('returns 404 for unknown media id', function () {
    $this->getJson('/admin/api/media/9999')->assertNotFound();
});

// ---- GET /admin/api/media/{id}/download ----

it('downloads a media file as an attachment with the original filename', function () {
    Storage::disk('public')->put('tbtop-media/report.pdf', 'PDF BYTES');
    $media = Media::create(mediaRow([
        'name' => 'Quarterly Report.pdf',
        'path' => 'tbtop-media/report.pdf',
        'mime' => 'application/pdf',
    ]));

    $response = $this->get("/admin/api/media/{$media->id}/download")->assertOk();

    expect($response->headers->get('content-disposition'))
        ->toContain('attachment')
        ->toContain('Quarterly Report.pdf')
        ->and($response->headers->get('x-content-type-options'))->toBe('nosniff');
});

it('download returns 404 for unknown media id', function () {
    $this->get('/admin/api/media/9999/download')->assertNotFound();
});

// ---- PATCH /admin/api/media/{id} ----

it('updates media name, alt and folderId', function () {
    $media = Media::create(mediaRow());
    $folder = MediaFolder::create(['name' => 'new-folder']);

    $response = $this->patchJson("/admin/api/media/{$media->id}", [
        'name' => 'renamed.png',
        'alt' => 'A nice photo',
        'folderId' => $folder->id,
    ])->assertOk();

    expect($response->json('name'))->toBe('renamed.png')
        ->and($response->json('alt'))->toBe('A nice photo')
        ->and($response->json('folderId'))->toBe($folder->id);
});

it('patch returns 404 for unknown media', function () {
    $this->patchJson('/admin/api/media/9999', ['name' => 'x'])->assertNotFound();
});

// ---- POST /admin/api/media/{id}/replace ----

it('replace deletes old files and stores new upload', function () {
    $oldFile = UploadedFile::fake()->image('old.png', 100, 100);
    $media = Media::create(mediaRow(['path' => 'tbtop-media/old.png']));
    Storage::disk('public')->put('tbtop-media/old.png', 'old content');

    $newFile = UploadedFile::fake()->image('new.png', 200, 200);

    $response = $this->post("/admin/api/media/{$media->id}/replace", ['file' => $newFile])
        ->assertOk();

    expect($response->json('mime'))->toBe('image/png')
        ->and($response->json('name'))->toBe('new.png');

    Storage::disk('public')->assertMissing('tbtop-media/old.png');
});

it('replace rejects disallowed mime', function () {
    $media = Media::create(mediaRow());
    $file = UploadedFile::fake()->create('hack.exe', 10, 'application/octet-stream');

    $this->post("/admin/api/media/{$media->id}/replace", ['file' => $file])->assertStatus(422);
});

// ---- DELETE /admin/api/media/{id} ----

it('delete removes media record and files from disk', function () {
    Storage::disk('public')->put('tbtop-media/photo.png', 'content');
    Storage::disk('public')->put('tbtop-media/photo-thumb.png', 'thumb content');

    $media = Media::create(mediaRow([
        'path' => 'tbtop-media/photo.png',
        'sizes' => ['thumb' => 'tbtop-media/photo-thumb.png'],
    ]));

    $this->deleteJson("/admin/api/media/{$media->id}")->assertNoContent();

    expect(Media::count())->toBe(0);
    Storage::disk('public')->assertMissing('tbtop-media/photo.png');
    Storage::disk('public')->assertMissing('tbtop-media/photo-thumb.png');
});

it('delete returns 404 for unknown media', function () {
    $this->deleteJson('/admin/api/media/9999')->assertNotFound();
});

// ---- GET /admin/api/media/folders ----

it('lists all folders flat', function () {
    $parent = MediaFolder::create(['name' => 'Parent']);
    MediaFolder::create(['name' => 'Child', 'parent_id' => $parent->id]);

    $data = $this->getJson('/admin/api/media/folders')->assertOk()->json();
    expect($data)->toHaveCount(2);
});

// ---- POST /admin/api/media/folders ----

it('creates a folder', function () {
    $response = $this->postJson('/admin/api/media/folders', ['name' => 'My Folder'])
        ->assertStatus(201);

    expect($response->json('name'))->toBe('My Folder')
        ->and($response->json('parentId'))->toBeNull();
    expect(MediaFolder::count())->toBe(1);
});

it('creates a nested folder', function () {
    $parent = MediaFolder::create(['name' => 'Root']);

    $response = $this->postJson('/admin/api/media/folders', [
        'name' => 'Sub',
        'parentId' => $parent->id,
    ])->assertStatus(201);

    expect($response->json('parentId'))->toBe($parent->id);
});

// ---- PATCH /admin/api/media/folders/{id} ----

it('renames a folder', function () {
    $folder = MediaFolder::create(['name' => 'Old Name']);

    $response = $this->patchJson("/admin/api/media/folders/{$folder->id}", ['name' => 'New Name'])
        ->assertOk();

    expect($response->json('name'))->toBe('New Name');
});

// ---- DELETE /admin/api/media/folders/{id} ----

it('deletes an empty folder', function () {
    $folder = MediaFolder::create(['name' => 'empty']);

    $this->deleteJson("/admin/api/media/folders/{$folder->id}")->assertNoContent();
    expect(MediaFolder::count())->toBe(0);
});

it('returns 409 when folder has media', function () {
    $folder = MediaFolder::create(['name' => 'with-files']);
    Media::create(mediaRow(['folder_id' => $folder->id]));

    $this->deleteJson("/admin/api/media/folders/{$folder->id}")->assertStatus(409);
});

it('returns 409 when folder has sub-folders', function () {
    $parent = MediaFolder::create(['name' => 'parent']);
    MediaFolder::create(['name' => 'child', 'parent_id' => $parent->id]);

    $this->deleteJson("/admin/api/media/folders/{$parent->id}")->assertStatus(409);
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
