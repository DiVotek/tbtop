<?php

use Tbtop\Admin\Tests\Fixtures\PostEditPage;

it('renders a page as inertia props with structure and form data', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $props = $response->json('props');
    expect($response->json('component'))->toBe('admin/page')
        ->and($props['slug'])->toBe('post-edit-page')
        ->and($props['structure']['kind'])->toBe('stack')
        ->and($props['data']['post']['title'])->toBe('Hello');

    $children = $props['structure']['options']['children'];
    expect($children[2]['options']['spec'])->toBe(['type' => 'server', 'needs' => ['row']])
        ->and($children[3]['options']['spec'])->toBe(['type' => 'visit', 'href' => '/admin/posts']);
});

it('validates and runs the form submit handler, flashing effects', function () {
    $response = $this->post('/admin/posts/1/edit/forms/post', [
        'title' => 'Updated',
        'sections' => [['heading' => 'One', 'body' => 'b']],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('tbtop.effects', [
        ['kind' => 'notify', 'message' => 'Saved', 'level' => 'success'],
    ]);
    expect(PostEditPage::$submitted)->toBe([
        'title' => 'Updated',
        'sections' => [['heading' => 'One', 'body' => 'b']],
    ]);
});

it('rejects invalid form data with field errors and skips the handler', function () {
    $response = $this->from('/admin/posts/1/edit')
        ->post('/admin/posts/1/edit/forms/post', [
            'sections' => [['body' => 'no heading']],
        ]);

    $response->assertSessionHasErrors(['title', 'sections.0.heading']);
    expect(PostEditPage::$submitted)->toBeNull();
});

it('runs a server action and returns effects json', function () {
    $response = $this->postJson('/admin/posts/1/edit/actions/publish', [
        'payload' => ['row' => ['id' => 7]],
    ]);

    $response->assertOk()->assertExactJson([
        'effects' => [
            ['kind' => 'notify', 'message' => 'Published 7', 'level' => 'success'],
            ['kind' => 'refreshTable'],
        ],
    ]);
});

it('404s an action without a server handler', function () {
    $this->postJson('/admin/posts/1/edit/actions/open-list')->assertNotFound();
});

it('404s an unknown form', function () {
    $this->post('/admin/posts/1/edit/forms/nope')->assertNotFound();
});
