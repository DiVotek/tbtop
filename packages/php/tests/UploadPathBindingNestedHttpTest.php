<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\FieldUploadHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\UploadBindingNestedPage;

uses(FieldUploadHttpTestCase::class);

beforeEach(function (): void {
    Storage::fake('public');
    config()->set('tbtop-admin.content_locales', ['en', 'uk']);
    config()->set('tbtop-admin.default_content_locale', 'en');
    UploadBindingNestedPage::$saved = [];
});

function issueNestedUpload(string $field): string
{
    return test()->postJson("/admin/upload-binding-nested/uploads/{$field}", [
        'file' => UploadedFile::fake()->image('x.png'),
    ])->assertOk()->json('data.path');
}

function saveDocRow(int $id, ?string $file): TestResponse
{
    return test()->postJson('/admin/upload-binding-nested/actions/editSave', [
        'payload' => ['row' => ['id' => $id], 'form' => ['file' => $file]],
    ]);
}

function submitArticle(array $form): TestResponse
{
    return test()->postJson('/admin/upload-binding-nested/forms/article', $form);
}

/** @return array<string, mixed> */
function storedArticle(array $overrides = []): array
{
    return [
        'body' => UploadBindingNestedPage::figureDocument('figures/current.png'),
        'slides' => [['slideImage' => ['en' => 'slides/current-en.png', 'uk' => null]]],
        ...$overrides,
    ];
}

it('row edit modal: keeps the file the modal loaded for that row', function (): void {
    saveDocRow(1, 'docs/one.pdf')->assertOk();

    expect(UploadBindingNestedPage::$saved[0]['file'])->toBe('docs/one.pdf');
});

it('row edit modal: refuses another row\'s file', function (): void {
    saveDocRow(1, 'docs/two.pdf')->assertStatus(422)->assertJsonValidationErrors(['file']);

    expect(UploadBindingNestedPage::$saved)->toBe([]);
});

it('row edit modal: accepts a path the upload endpoint issued to this session', function (): void {
    $path = issueNestedUpload('file');

    saveDocRow(1, $path)->assertOk();

    expect(UploadBindingNestedPage::$saved[0]['file'])->toBe($path);
});

it('richtext embed: keeps the stored image and accepts an issued one', function (): void {
    submitArticle(storedArticle())->assertSessionHasNoErrors();

    $path = issueNestedUpload('figureImage');
    submitArticle(storedArticle(['body' => UploadBindingNestedPage::figureDocument($path)]))
        ->assertSessionHasNoErrors();

    expect(UploadBindingNestedPage::$saved)->toHaveCount(2);
});

it('richtext embed: refuses a foreign image path', function (): void {
    submitArticle(storedArticle(['body' => UploadBindingNestedPage::figureDocument('figures/someone-elses.png')]))
        ->assertStatus(422)->assertJsonValidationErrors(['body']);

    expect(UploadBindingNestedPage::$saved)->toBe([]);
});

it('translatable repeater: keeps stored paths and refuses a foreign one in any locale', function (): void {
    submitArticle(storedArticle())->assertSessionHasNoErrors();

    submitArticle(storedArticle([
        'slides' => [['slideImage' => ['en' => 'slides/current-en.png', 'uk' => 'slides/someone-elses.png']]],
    ]))->assertStatus(422)->assertJsonValidationErrors(['slides.0.slideImage.uk']);

    expect(UploadBindingNestedPage::$saved)->toHaveCount(1);
});
