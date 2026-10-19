<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\UploadBindingPage;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    UploadBindingPage::$saved = [];
});

function submitUploadBinding(array $form): TestResponse
{
    return test()->from('/admin/upload-binding-page')
        ->post('/admin/upload-binding-page/forms/edit', $form);
}

it('refuses an upload path that is neither stored on the record nor issued to the session', function (): void {
    submitUploadBinding(['avatar' => 'uploads/someone-elses.pdf', 'gallery' => []])
        ->assertSessionHasErrors('avatar');

    expect(UploadBindingPage::$saved)->toBe([]);
});

it('accepts a path the field upload endpoint just issued to this session', function (): void {
    $path = test()->postJson('/admin/upload-binding-page/uploads/avatar', [
        'file' => UploadedFile::fake()->image('a.png'),
    ])->assertOk()->json('data.path');

    submitUploadBinding(['avatar' => $path, 'gallery' => []])->assertSessionHasNoErrors();

    expect(UploadBindingPage::$saved[0]['avatar'])->toBe($path);
});

it('accepts the unchanged stored paths when an edit form is re-submitted', function (): void {
    submitUploadBinding([
        'avatar' => 'avatars/current.png',
        'gallery' => ['avatars/g2.png', 'avatars/g1.png'],
    ])->assertSessionHasNoErrors();

    expect(UploadBindingPage::$saved[0]['gallery'])->toBe(['avatars/g2.png', 'avatars/g1.png']);
});

it('refuses a multiple upload carrying one foreign path among valid ones', function (): void {
    $path = test()->postJson('/admin/upload-binding-page/uploads/gallery', [
        'file' => UploadedFile::fake()->image('b.png'),
    ])->assertOk()->json('data.path');

    submitUploadBinding([
        'avatar' => 'avatars/current.png',
        'gallery' => ['avatars/g1.png', $path, 'uploads/someone-elses.pdf'],
    ])->assertSessionHasErrors('gallery.2');

    expect(UploadBindingPage::$saved)->toBe([]);
});
