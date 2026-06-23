<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    config()->set('tbtop-admin.uploads', [
        'media' => [
            'disk' => 'public',
            'dir' => 'uploads',
            'accept' => ['image/*'],
            'maxSize' => 5 * 1024 * 1024,
            'sizes' => ['thumb' => [128, 128]],
        ],
    ]);
});

it('stores an image, reports dimensions and generates the thumb variant', function () {
    $file = UploadedFile::fake()->image('photo.png', 600, 400);

    $response = $this->postJson('/admin/uploads/media', ['file' => $file]);

    $response->assertOk();
    $data = $response->json('data');
    expect($data['filename'])->toBe('photo.png')
        ->and($data['width'])->toBe(600)
        ->and($data['height'])->toBe(400)
        ->and($data['sizes'][0]['name'])->toBe('thumb')
        ->and($data['sizes'][0]['width'])->toBe(128)
        ->and($data['sizes'][0]['height'])->toBe(85);
    Storage::disk('public')->assertExists('uploads/'.$data['id']);
});

it('returns the full storage path alongside the basename id', function () {
    $file = UploadedFile::fake()->image('photo.png', 600, 400);

    $data = $this->postJson('/admin/uploads/media', ['file' => $file])->json('data');

    // path is the full relative path; id stays the basename for back-compat.
    expect($data['path'])->toBe('uploads/'.$data['id'])
        ->and($data['id'])->toBe(basename($data['path']));
    Storage::disk('public')->assertExists($data['path']);
});

it('returns same-origin urls path-relative so stored links survive host changes', function () {
    config()->set('app.url', 'http://localhost');
    // Real public disk bakes APP_URL into urls; mirror that in the fake.
    Storage::fake('public', ['url' => 'http://localhost/storage']);
    $file = UploadedFile::fake()->image('photo.png', 600, 400);

    $data = $this->postJson('/admin/uploads/media', ['file' => $file])->json('data');

    expect($data['url'])->toStartWith('/storage/uploads/')
        ->and($data['sizes'][0]['url'])->toStartWith('/storage/uploads/');
});

it('rejects disallowed mime types', function () {
    $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

    $this->postJson('/admin/uploads/media', ['file' => $file])->assertStatus(422);
});

it('404s an unknown profile', function () {
    $file = UploadedFile::fake()->image('p.png');

    $this->postJson('/admin/uploads/nope', ['file' => $file])->assertNotFound();
});
