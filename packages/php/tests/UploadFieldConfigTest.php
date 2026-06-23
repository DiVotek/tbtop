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
        ->and($config->image)->toBeNull()
        ->and($config->sizes)->toBe([]);
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

it('Upload: minFiles() serializes as options.minFiles', function (): void {
    $node = Upload::make('gallery')->multiple()->minFiles(2)->toNode();

    expect($node->options['minFiles'])->toBe(2);
});

it('Upload: image() sets accept to image/*', function (): void {
    $node = Upload::make('cover')->image()->toNode();

    expect($node->options['accept'])->toBe('image/*');
});

it('Upload: image() leaves the image conversion bag untouched', function (): void {
    // The `image` option key is the {convertTo, quality} conversion bag.
    // image() must not overload it into a boolean and break conversion.
    $node = Upload::make('cover')->convertTo('webp')->quality(70)->image()->toNode();

    expect($node->options['image'])->toBe(['convertTo' => 'webp', 'quality' => 70])
        ->and($node->options['accept'])->toBe('image/*');
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

it('UploadFieldConfig: inline options override the preset base', function (): void {
    config()->set('tbtop-admin.uploads', [
        'foo' => [
            'disk' => 'public',
            'directory' => 'presets',
            'sizes' => ['thumb' => [64, 64]],
        ],
    ]);

    $field = Upload::make('avatar')->profile('foo')->disk('s3');
    $config = UploadFieldConfig::resolve($field);

    expect($config->disk)->toBe('s3')          // inline wins
        ->and($config->directory)->toBe('presets') // from preset
        ->and($config->sizes)->toBe(['thumb' => [64, 64]]);
});
