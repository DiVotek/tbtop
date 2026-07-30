<?php

use Tbtop\Admin\Media\MediaUploadLimit;

it('reads the configured ceiling', function () {
    config()->set('tbtop-admin.media.max_size', 2048);

    expect(MediaUploadLimit::kilobytes())->toBe(2048)
        ->and(MediaUploadLimit::bytes())->toBe(2048 * 1024);
});

// A published config using env() with no value yields null, which would
// otherwise cast to a max:0 rule and reject every upload.
it('falls back to the default when the setting is present but empty', function (mixed $empty) {
    config()->set('tbtop-admin.media.max_size', $empty);

    expect(MediaUploadLimit::kilobytes())->toBe(MediaUploadLimit::DEFAULT_KILOBYTES);
})->with([[null], ['']]);
