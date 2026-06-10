<?php

use Illuminate\Support\Facades\Schema;

it('package migrations run without vendor:publish', function () {
    expect(Schema::hasTable('tbtop_media'))->toBeTrue()
        ->and(Schema::hasTable('tbtop_media_folders'))->toBeTrue();
});
