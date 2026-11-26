<?php

use Tbtop\Admin\Dsl\Fields\Upload;
use Tbtop\Admin\Uploads\UploadFieldConfig;

function cropOf(Upload $field): mixed
{
    return $field->toNode()->options['image']['crop'] ?? null;
}

it('crop() locks one aspect, and with no argument crops freely', function (): void {
    expect(cropOf(Upload::make('cover')->crop('16:9')))->toBe(['aspects' => ['16:9']])
        ->and(cropOf(Upload::make('photo')->crop()))->toBe(['aspects' => ['free']]);
});

it('cropAspects() offers a choice in the given order, without duplicates', function (): void {
    $crop = cropOf(Upload::make('hero')->cropAspects(['16:9', '4:3', 'free', '16:9']));

    expect($crop)->toBe(['aspects' => ['16:9', '4:3', 'free']]);
});

it('cropCircle() defaults to a square and keeps an aspect set before or after it', function (): void {
    expect(cropOf(Upload::make('avatar')->cropCircle()))->toBe(['aspects' => ['1:1'], 'shape' => 'round'])
        ->and(cropOf(Upload::make('a')->crop('4:3')->cropCircle()))->toBe(['aspects' => ['4:3'], 'shape' => 'round'])
        ->and(cropOf(Upload::make('b')->cropCircle()->crop('4:3')))->toBe(['aspects' => ['4:3'], 'shape' => 'round']);
});

it('cropCircle(false) does not turn cropping on by itself', function (): void {
    expect(cropOf(Upload::make('avatar')->cropCircle(false)))->toBeNull();
});

it('crop sits next to the conversion options without enabling conversion', function (): void {
    $field = Upload::make('cover')->convertTo('webp')->quality(80)->crop('3:2');

    expect($field->toNode()->options['image'])->toBe([
        'convertTo' => 'webp',
        'quality' => 80,
        'crop' => ['aspects' => ['3:2']],
    ])->and(UploadFieldConfig::resolve(Upload::make('x')->crop())->image)->toBeNull();
});

it('rejects a malformed or zero-sided aspect', function (string $aspect): void {
    Upload::make('cover')->crop($aspect);
})->with(['16/9', 'wide', '0:1', '4:0', ''])->throws(InvalidArgumentException::class);

it('rejects an empty aspect list', function (): void {
    Upload::make('cover')->cropAspects([]);
})->throws(InvalidArgumentException::class);
