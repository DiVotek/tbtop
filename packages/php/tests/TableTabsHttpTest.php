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
        ['title' => 'Gamma', 'views' => 20, 'published' => true],
    ]);
});

it('scopes rows to the requested tab', function () {
    $rows = $this->getJson('/admin/tab-posts/tables/posts?tab=draft')->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Beta']);
});

it('applies the first declared tab when no tab param is sent', function () {
    $response = $this->getJson('/admin/tab-posts/tables/posts');

    expect($response->json('data.total'))->toBe(2)
        ->and(array_column($response->json('data.data'), 'title'))->toBe(['Alpha', 'Gamma']);
});

it('returns all rows for an unscoped tab', function () {
    $response = $this->getJson('/admin/tab-posts/tables/posts?tab=all');

    expect($response->json('data.total'))->toBe(3);
});

it('rejects an unknown tab name with 422', function () {
    $this->getJson('/admin/tab-posts/tables/posts?tab=nope')->assertUnprocessable();
});

it('composes the tab scope with runtime search', function () {
    $rows = $this->getJson('/admin/tab-posts/tables/posts?tab=published&search=Alpha')->json('data.data');

    expect(array_column($rows, 'title'))->toBe(['Alpha']);
});

it('reports counts for count-enabled tabs, unaffected by the active search', function () {
    $response = $this->getJson('/admin/tab-posts/tables/posts?tab=published&search=Alpha');

    expect($response->json('data.tabCounts'))->toBe(['published' => 2, 'draft' => 1])
        ->and($response->json('data.total'))->toBe(1);
});

it('simplePagination() pages without a total and reports hasMore from one extra row', function () {
    $first = $this->getJson('/admin/tab-posts/tables/simple-posts')->assertOk();
    $last = $this->getJson('/admin/tab-posts/tables/simple-posts?page=2')->assertOk();

    expect($first->json('data'))->not->toHaveKey('total')
        ->and($first->json('data.hasMore'))->toBeTrue()
        ->and(array_column($first->json('data.data'), 'title'))->toBe(['Alpha', 'Beta'])
        ->and($last->json('data.hasMore'))->toBeFalse()
        ->and(array_column($last->json('data.data'), 'title'))->toBe(['Gamma']);
});

it('simplePagination() reports no next page when the page is exactly full', function () {
    $response = $this->getJson('/admin/tab-posts/tables/simple-posts?tab=published&perPage=2');

    expect($response->json('data.hasMore'))->toBeFalse()
        ->and($response->json('data.data'))->toHaveCount(2);
});

it('simplePagination() skips the row count query but keeps tab counts', function () {
    DB::enableQueryLog();
    $response = $this->getJson('/admin/tab-posts/tables/simple-posts?perPage=1');
    $counts = array_filter(DB::getQueryLog(), fn (array $q) => str_contains(strtolower($q['query']), 'count('));

    expect($response->json('data.tabCounts'))->toBe(['published' => 2])
        ->and($counts)->toHaveCount(1);
});
