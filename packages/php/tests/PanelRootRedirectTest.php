<?php

// Panel root redirect: GET {prefix} 302s to the panel's first page with a
// static path, under the same auth stack as the panel's page routes.

it('redirects the panel root to the first static-path page', function () {
    $this->get('/plain')->assertStatus(302)->assertRedirect('/plain/nav-demo');
});

it('skips parametrized paths when picking the redirect target', function () {
    // AdminPanel declares PostEditPage (posts/{post}/edit) first — not a valid
    // redirect target — so the root lands on PostsIndexPage (posts).
    $this->get('/admin')->assertRedirect('/admin/posts');
});

it('guards the root redirect like the panel page routes', function () {
    auth()->logout();

    $this->getJson('/admin')->assertUnauthorized();
});

it('leaves existing page routes untouched', function () {
    $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true'])->assertOk();
    $this->get('/plain/nav-demo', ['X-Inertia' => 'true'])->assertOk();
});
