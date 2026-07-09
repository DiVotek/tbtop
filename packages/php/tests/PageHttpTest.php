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
    // Effects travel via Inertia native flash — delivery is asserted by the
    // consecutive-submit test below.
    expect(PostEditPage::$submitted)->toBe([
        'title' => 'Updated',
        'sections' => [['heading' => 'One', 'body' => 'b']],
    ]);
});

it('delivers form effects via inertia native flash on every consecutive submit', function () {
    // Regression: effects lived in shared props; Inertia v3 preserveEqualProps
    // reused the old reference on identical consecutive saves, so the client
    // effect never re-fired (toasts stopped after the first save). Native
    // page-level flash is re-delivered per response and skips that dedup.
    $payload = ['title' => 'Updated', 'sections' => [['heading' => 'One', 'body' => 'b']]];
    $expected = [['kind' => 'notify', 'message' => 'Saved', 'level' => 'success']];

    $this->from('/admin/posts/1/edit')
        ->post('/admin/posts/1/edit/forms/post', $payload)
        ->assertRedirect();
    $first = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);
    expect($first->json('flash')['tbtop.effects'] ?? null)->toBe($expected);

    $this->from('/admin/posts/1/edit')
        ->post('/admin/posts/1/edit/forms/post', $payload)
        ->assertRedirect();
    $second = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);
    expect($second->json('flash')['tbtop.effects'] ?? null)->toBe($expected);
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

it('omits headerActions prop when the page declares none', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    expect($response->json('props'))->not->toHaveKey('headerActions');
});
