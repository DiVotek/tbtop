<?php

use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Uploads\UploadFieldConfig;

it('UploadFieldConfig: applies defaults when nothing is set', function (): void {
    $config = UploadFieldConfig::resolve(Upload::make('avatar'));

    expect($config->disk)->toBe('public')
        ->and($config->directory)->toBe('uploads')
        ->and($config->visibility)->toBe('public')
        ->and($config->maxSize)->toBe(5 * 1024 * 1024)
        ->and($config->accept)->toBe([])
        ->and($config->image)->toBeNull();
});

it('UploadFieldConfig: normalizes a string accept to a list', function (): void {
    $config = UploadFieldConfig::resolve(Upload::make('avatar')->accept('image/*'));

    expect($config->accept)->toBe(['image/*']);
});

it('UploadFieldConfig: accepts a list of mime patterns', function (): void {
    $config = UploadFieldConfig::resolve(Upload::make('doc')->accept(['application/pdf', 'image/*']));

    expect($config->accept)->toBe(['application/pdf', 'image/*']);
});

it('UploadFieldConfig: splits a comma string into trimmed patterns', function (): void {
    $config = UploadFieldConfig::resolve(Upload::make('doc')->accept('application/pdf, image/*'));

    expect($config->accept)->toBe(['application/pdf', 'image/*']);
});

it('UploadFieldConfig: assertMime allows every pattern in the list, rejects the rest', function (): void {
    $config = UploadFieldConfig::resolve(Upload::make('doc')->accept(['application/pdf', 'image/*']));

    $png = UploadedFile::fake()->create('a.png', 1, 'image/png');
    $pdf = UploadedFile::fake()->create('b.pdf', 1, 'application/pdf');
    $xlsx = UploadedFile::fake()->create('c.xlsx', 1, 'application/vnd.ms-excel');

    $config->assertMime($png);
    $config->assertMime($pdf);
    expect(fn () => $config->assertMime($xlsx))
        ->toThrow(HttpException::class);
});

it('UploadFieldConfig: exposes the nested image conversion options', function (): void {
    $config = UploadFieldConfig::resolve(
        Upload::make('cover')->convertTo('webp')->quality(70),
    );

    expect($config->image)->toBe(['convertTo' => 'webp', 'quality' => 70]);
});

it('Upload: multiple() serializes as options.multiple = true', function (): void {
    $node = Upload::make('gallery')->multiple()->toNode();

    expect($node->options['multiple'])->toBeTrue();
});

it('Upload: maxFiles() serializes as options.maxFiles', function (): void {
    $node = Upload::make('gallery')->multiple()->maxFiles(5)->toNode();

    expect($node->options['maxFiles'])->toBe(5);
});

it('Upload: reorderable() serializes as options.reorderable = true', function (): void {
    $node = Upload::make('gallery')->multiple()->reorderable()->toNode();

    expect($node->options['reorderable'])->toBeTrue();
});

it('Upload: isMultiple() reads back the flag', function (): void {
    $field = Upload::make('gallery')->multiple();

    expect($field->isMultiple())->toBeTrue();
    expect(Upload::make('single')->isMultiple())->toBeFalse();
});
