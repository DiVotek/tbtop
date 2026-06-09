<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::create('posts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->integer('views')->default(0);
        $table->boolean('published')->default(false);
    });
    DB::table('posts')->insert([
        ['title' => 'Alpha', 'views' => 10, 'published' => true],
        ['title' => 'Beta', 'views' => 30, 'published' => false],
        ['title' => 'Gamma news', 'views' => 20, 'published' => true],
    ]);
});

it('serves paginated table rows with total, default-sorted', function () {
    $response = $this->getJson('/admin/posts/tables/posts?perPage=2');

    $response->assertOk();
    $rows = $response->json('data.data');
    expect($response->json('data.total'))->toBe(3)
        ->and(array_column($rows, 'title'))->toBe(['Beta', 'Gamma news']);
});

it('searches across searchable fields', function () {
    $rows = $this->getJson('/admin/posts/tables/posts?search=news')->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Gamma news']);
});

it('applies equality filters and explicit sort', function () {
    $rows = $this->getJson('/admin/posts/tables/posts?filters[published]=1&sort=views&dir=asc')
        ->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Alpha', 'Gamma news']);
});

it('serves chart data from the page data endpoint', function () {
    $response = $this->getJson('/admin/posts/data/byStatus');

    $response->assertOk();
    expect($response->json('data'))->toBe([
        ['status' => 'Draft', 'total' => 1],
        ['status' => 'Published', 'total' => 2],
    ]);
});

it('404s a table without a query and an unknown data source', function () {
    $this->getJson('/admin/posts/tables/nope')->assertNotFound();
    $this->getJson('/admin/posts/data/nope')->assertNotFound();
});
