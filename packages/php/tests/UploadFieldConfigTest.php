<?php

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

it('UploadFieldConfig: exposes the nested image conversion options', function (): void {
    $config = UploadFieldConfig::resolve(
        Upload::make('cover')->convertTo('webp')->quality(70),
    );

    expect($config->image)->toBe(['convertTo' => 'webp', 'quality' => 70]);
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
