<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
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
