<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::create('tposts', function ($table): void {
        $table->id();
        $table->text('title');
        $table->integer('views')->default(0);
    });
    DB::table('tposts')->insert([
        ['title' => json_encode(['en' => 'Hello', 'uk' => 'Привіт']), 'views' => 5],
        ['title' => json_encode(['uk' => 'Тільки укр']), 'views' => 7],
        ['title' => 'Legacy plain title', 'views' => 9],
    ]);
});

it('projects translatable columns to the default content locale', function () {
    $rows = $this->getJson('/admin/tposts/tables/tposts')->json('data.data');

    expect(array_column($rows, 'title'))->toBe([
        'Hello',          // default locale value
        'Тільки укр',     // default empty -> first non-null fallback
        'Legacy plain title', // legacy scalar untouched
    ]);
});

it('leaves non-translatable columns untouched', function () {
    $rows = $this->getJson('/admin/tposts/tables/tposts')->json('data.data');

    expect(array_column($rows, 'views'))->toBe([5, 7, 9]);
});
