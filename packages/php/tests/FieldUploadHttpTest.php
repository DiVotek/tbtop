<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    Storage::fake('local');
});

it('FieldUpload: stores using disk and directory from the node', function (): void {
    $file = UploadedFile::fake()->image('a.png', 600, 400);

    $response = $this->postJson('/admin/upload-field-page/uploads/avatar', ['file' => $file]);

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveKeys(['id', 'filename', 'mimeType', 'filesize', 'url', 'width', 'height', 'sizes'])
        ->and($data['filename'])->toBe('a.png')
        ->and($data['width'])->toBe(600)
        ->and($data['height'])->toBe(400);
    Storage::disk('public')->assertExists('avatars/'.$data['id']);
});

it('FieldUpload: client cannot override disk or directory from the body', function (): void {
    $file = UploadedFile::fake()->image('a.png');

    $data = $this->postJson('/admin/upload-field-page/uploads/avatar', [
        'file' => $file,
        'disk' => 'private',
        'directory' => 'evil',
    ])->assertOk()->json('data');

    // Server read the node, ignored the body: still public disk, avatars/ dir.
    Storage::disk('public')->assertExists('avatars/'.$data['id']);
    Storage::disk('public')->assertMissing('evil/'.$data['id']);
    expect($data['url'])->toContain('avatars/');
});

it('FieldUpload: converts to webp and drops the original', function (): void {
    $file = UploadedFile::fake()->image('c.png', 300, 200);

    $data = $this->postJson('/admin/upload-field-page/uploads/cover', ['file' => $file])
        ->assertOk()->json('data');

    expect($data['mimeType'])->toBe('image/webp')
        ->and($data['id'])->toEndWith('.webp')
        ->and($data['url'])->toEndWith('.webp');
    Storage::disk('public')->assertExists('covers/'.$data['id']);
    Storage::disk('public')->assertMissing('covers/'.basename(str_replace('.webp', '.png', $data['id'])));
})->skip(! function_exists('imagewebp'), 'GD webp encoder unavailable');

it('FieldUpload: rejects a mime outside the accept allowlist', function (): void {
    $file = UploadedFile::fake()->create('x.pdf', 10, 'application/pdf');

    $this->postJson('/admin/upload-field-page/uploads/doc', ['file' => $file])
        ->assertStatus(422);
});

it('FieldUpload: unknown upload field returns 404', function (): void {
    $file = UploadedFile::fake()->image('a.png');

    $this->postJson('/admin/upload-field-page/uploads/doesnotexist', ['file' => $file])
        ->assertNotFound();
});

it('FieldUpload: gated page denies the upload like every page endpoint', function (): void {
    Gate::define('view-gated-uploads', fn (?object $user) => false);
    $file = UploadedFile::fake()->image('a.png');

    $this->postJson('/admin/gated-upload-page/uploads/avatar', ['file' => $file])
        ->assertForbidden();
});

it('FieldUpload: gated page allows the upload when the gate passes', function (): void {
    Gate::define('view-gated-uploads', fn (?object $user) => true);
    $file = UploadedFile::fake()->image('a.png');

    $this->postJson('/admin/gated-upload-page/uploads/avatar', ['file' => $file])
        ->assertOk();
});

// --- Private uploads: signed-url response + streaming view route ---------------

it('FieldUpload: a private upload returns a signed view-route url, not /storage', function (): void {
    $data = $this->postJson('/admin/upload-field-page/uploads/secret', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->assertOk()->json('data');

    expect($data['url'])
        ->toContain('/upload-field-page/uploads/secret/view')
        ->toContain('signature=')
        ->not->toContain('/storage');
    Storage::disk('local')->assertExists('private-docs/'.$data['id']);
});

it('FieldUpload: the signed view url streams the private file with a nosniff header', function (): void {
    $url = $this->postJson('/admin/upload-field-page/uploads/secret', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->json('data.url');

    $this->get($url)
        ->assertOk()
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('FieldUpload: each private variant url is signed too', function (): void {
    if (! function_exists('imagecreatefromstring')) {
        $this->markTestSkipped('GD unavailable');
    }
    config()->set('tbtop-admin.uploads.thumbed', ['sizes' => ['thumb' => [64, 64]]]);

    $data = $this->postJson('/admin/upload-field-page/uploads/sized', [
        'file' => UploadedFile::fake()->image('a.png', 200, 200),
    ])->assertOk()->json('data');

    expect($data['sizes'])->not->toBeEmpty();
    expect($data['sizes'][0]['url'])
        ->toContain('/uploads/sized/view')
        ->toContain('signature=');
});

it('FieldUpload: a custom save closure overrides storage and is still signed', function (): void {
    $data = $this->postJson('/admin/upload-field-page/uploads/custom', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->assertOk()->json('data');

    expect($data['filename'])->toBe('overridden.bin')
        ->and($data['url'])->toContain('/uploads/custom/view')->toContain('signature=');
});

it('FieldUpload: a tampered signature is rejected', function (): void {
    $url = $this->postJson('/admin/upload-field-page/uploads/secret', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->json('data.url');

    $this->get($url.'tampered')->assertForbidden();
});

it('FieldUpload: an expired signature is rejected', function (): void {
    $url = $this->postJson('/admin/upload-field-page/uploads/secret', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->json('data.url');

    $this->travel(6)->minutes();
    $this->get($url)->assertForbidden();
});

it('FieldUpload: a signed path outside the field directory is rejected by the zone guard', function (): void {
    // Sign a malicious path so the signature passes and the zone check is the rejecter.
    $escape = URL::temporarySignedRoute(
        'tbtop.admin.upload-field-page.uploadView',
        now()->addMinutes(5),
        ['tbtopField' => 'secret', 'path' => 'other-dir/x.webp'],
    );
    $traverse = URL::temporarySignedRoute(
        'tbtop.admin.upload-field-page.uploadView',
        now()->addMinutes(5),
        ['tbtopField' => 'secret', 'path' => '../private-docs/x.webp'],
    );

    $this->get($escape)->assertForbidden();
    $this->get($traverse)->assertForbidden();
});

it('FieldUpload: the signed view route inherits the page gate', function (): void {
    Gate::define('view-gated-uploads', fn (?object $user) => false);
    $url = URL::temporarySignedRoute(
        'tbtop.admin.gated-upload-page.uploadView',
        now()->addMinutes(5),
        ['tbtopField' => 'avatar', 'path' => 'private-docs/x.webp'],
    );

    $this->get($url)->assertForbidden();
});

it('FieldUpload: a public upload is unchanged — /storage url, no signature', function (): void {
    $data = $this->postJson('/admin/upload-field-page/uploads/avatar', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->assertOk()->json('data');

    expect($data['url'])->toContain('/storage')->not->toContain('signature=');
});
