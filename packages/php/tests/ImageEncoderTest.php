<?php

use Illuminate\Http\UploadedFile;
use Tbtop\Admin\Uploads\ImageEncoder;
use Tbtop\Admin\Uploads\ImageSizes;

function gdSample(): GdImage
{
    $img = imagecreatetruecolor(10, 10);
    imagefilledrectangle($img, 0, 0, 9, 9, imagecolorallocate($img, 10, 20, 30));

    return $img;
}

// ------- encode: round-trips and reports the right mime/ext -------

it('encodes webp to a decodable blob with webp mime/ext', function () {
    $enc = ImageEncoder::encode(gdSample(), 'webp');

    expect($enc)->not->toBeNull()
        ->and($enc['blob'])->not->toBe('')
        ->and($enc['mimeType'])->toBe('image/webp')
        ->and($enc['ext'])->toBe('webp')
        ->and(getimagesizefromstring($enc['blob'])['mime'])->toBe('image/webp');
})->skip(! function_exists('imagewebp'), 'GD webp unavailable');

it('encodes jpeg to a decodable blob with jpeg mime and jpg ext', function () {
    $enc = ImageEncoder::encode(gdSample(), 'jpeg');

    expect($enc)->not->toBeNull()
        ->and($enc['blob'])->not->toBe('')
        ->and($enc['mimeType'])->toBe('image/jpeg')
        ->and($enc['ext'])->toBe('jpg')
        ->and(getimagesizefromstring($enc['blob'])['mime'])->toBe('image/jpeg');
});

it('encodes png to a decodable blob with png mime/ext', function () {
    $enc = ImageEncoder::encode(gdSample(), 'png');

    expect($enc)->not->toBeNull()
        ->and($enc['blob'])->not->toBe('')
        ->and($enc['mimeType'])->toBe('image/png')
        ->and($enc['ext'])->toBe('png')
        ->and(getimagesizefromstring($enc['blob'])['mime'])->toBe('image/png');
});

it('returns null when encoding an unknown format', function () {
    expect(ImageEncoder::encode(gdSample(), 'gif'))->toBeNull();
});

// ------- supports: mirrors function_exists, false for unknown -------

it('supports reflects function_exists for each format', function (string $format, string $fn) {
    expect(ImageEncoder::supports($format))->toBe(function_exists($fn));
})->with([
    'webp' => ['webp', 'imagewebp'],
    'jpeg' => ['jpeg', 'imagejpeg'],
    'png' => ['png', 'imagepng'],
]);

it('supports is false for an unknown format', function (string $format) {
    expect(ImageEncoder::supports($format))->toBeFalse();
})->with(['gif', 'bmp']);

// ------- fromUpload: GdImage for an image, null for a non-image -------

it('decodes a real image upload to a GdImage', function () {
    $file = UploadedFile::fake()->image('x.png', 10, 10);

    expect(ImageEncoder::fromUpload($file))->toBeInstanceOf(GdImage::class);
});

it('returns null for a non-image upload', function () {
    $file = UploadedFile::fake()->createWithContent('notes.txt', 'just text, not an image');

    expect(ImageEncoder::fromUpload($file))->toBeNull();
});

// 1-bit grayscale square PNG: solid white compresses to a few KB at any size.
function solidPng(int $side): UploadedFile
{
    $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    $row = "\0".str_repeat("\xff", intdiv($side, 8));
    $png = "\x89PNG\r\n\x1a\n"
        .$chunk('IHDR', pack('NNCCCCC', $side, $side, 1, 0, 0, 0, 0))
        .$chunk('IDAT', gzcompress(str_repeat($row, $side)))
        .$chunk('IEND', '');

    return UploadedFile::fake()->createWithContent("{$side}.png", $png);
}

it('does not decode an image whose header declares more than 40 megapixels', function () {
    $file = solidPng(6400); // 40.96 MP

    expect(ImageSizes::dimensions($file))->toBe([6400, 6400])
        ->and(ImageEncoder::fromUpload($file))->toBeNull();
});

it('still decodes an image just under the 40 megapixel cap', function () {
    $file = solidPng(6320); // 39.94 MP

    expect(ImageEncoder::fromUpload($file))->toBeInstanceOf(GdImage::class);
});
