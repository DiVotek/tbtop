<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    Storage::fake('local');
});

// Regression: a private upload on a parametrised page path (records/{record}/edit).
// The signed view route inherits {record}, so the url builder must supply it —
// before the fix Laravel threw "Missing required parameter ... [Missing parameter: record]".

it('Parametrised render: a private value signs without the missing-param throw', function (): void {
    $record = $this->get('/admin/records/42/edit', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.data.main');

    expect($record['secret']['url'])
        ->toContain('/records/42/edit/uploads/secret/view')
        ->toContain('signature=')
        ->toContain('expires=');
});

it('Parametrised render: the signed url streams the file end to end', function (): void {
    Storage::disk('local')->put('private-docs/sample.webp', 'webp-bytes');

    $url = $this->get('/admin/records/42/edit', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.data.main.secret.url');

    $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('Parametrised upload: the POST response url is a working signed view url', function (): void {
    $file = UploadedFile::fake()->image('a.png');

    $url = $this->postJson('/admin/records/42/edit/uploads/secret', ['file' => $file])
        ->assertOk()
        ->json('data.url');

    expect($url)->toContain('/records/42/edit/uploads/secret/view')->toContain('signature=');
    $this->get($url)->assertOk();
});
