<?php

use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\CrudActionHttpTestCase;
use Tbtop\Admin\Tests\Fixtures\CaPost;

uses(CrudActionHttpTestCase::class);

beforeEach(function (): void {
    Schema::create('caposts', function ($table): void {
        $table->id();
        $table->string('title');
        $table->boolean('published')->default(false);
    });
    CaPost::create(['title' => 'First', 'published' => false]);
});

it('serializes built-in action labels/confirm in English by default', function (): void {
    $response = $this->get('/admin/crud-actions', ['X-Inertia' => 'true']);

    $response->assertOk();
    $children = collect($response->json('props.structure.options.children'))->keyBy('name');

    expect($children['edit']['options']['label'])->toBe('Edit')
        ->and($children['edit']['options']['spec']['title'])->toBe('Edit record')
        ->and($children['delete']['options']['label'])->toBe('Delete')
        ->and($children['delete']['options']['confirm'])->toBe([
            'title' => 'Delete record?',
            'description' => 'This action cannot be undone.',
        ])
        ->and($children['delete-selected']['options']['label'])->toBe('Delete selected')
        ->and($children['delete-selected']['options']['confirm']['title'])->toBe('Delete selected records?');
});

it('serializes built-in action labels/confirm in Ukrainian when the admin locale is uk', function (): void {
    session(['tbtop.locale' => 'uk']);

    $response = $this->get('/admin/crud-actions', ['X-Inertia' => 'true']);

    $response->assertOk();
    $children = collect($response->json('props.structure.options.children'))->keyBy('name');

    expect($children['edit']['options']['label'])->toBe('Редагувати')
        ->and($children['edit']['options']['spec']['title'])->toBe('Редагування запису')
        ->and($children['delete']['options']['label'])->toBe('Видалити')
        ->and($children['delete']['options']['confirm'])->toBe([
            'title' => 'Видалити запис?',
            'description' => 'Цю дію не можна скасувати.',
        ])
        ->and($children['delete-selected']['options']['label'])->toBe('Видалити вибрані')
        ->and($children['delete-selected']['options']['confirm']['title'])->toBe('Видалити вибрані записи?');
});

it('runs delete with English notify text by default', function (): void {
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/delete', [
        'payload' => ['row' => ['id' => $post->id]],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Record deleted', 'level' => 'success']);
});

it('runs delete with Ukrainian notify text when the admin locale is uk', function (): void {
    session(['tbtop.locale' => 'uk']);
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/delete', [
        'payload' => ['row' => ['id' => $post->id]],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Запис видалено', 'level' => 'success']);
});

it('runs edit save with Ukrainian notify text when the admin locale is uk', function (): void {
    session(['tbtop.locale' => 'uk']);
    $post = CaPost::where('title', 'First')->first();

    $response = $this->postJson('/admin/crud-actions/actions/editSave', [
        'payload' => [
            'row' => ['id' => $post->id],
            'form' => ['title' => 'Renamed', 'published' => true],
        ],
    ]);

    $response->assertOk();
    expect($response->json('effects'))->toContain(['kind' => 'notify', 'message' => 'Збережено', 'level' => 'success']);
});
