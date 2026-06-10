<?php

it('locale endpoint writes the session and redirects back', function () {
    $response = $this->from('/admin/posts/1/edit')
        ->post('/admin/locale', ['locale' => 'en']);

    $response->assertRedirect('/admin/posts/1/edit');
    expect(session('tbtop.locale'))->toBe('en');
});

it('locale endpoint rejects an unknown locale and does not write session', function () {
    $this->post('/admin/locale', ['locale' => 'fr'])
        ->assertSessionHasErrors(['locale']);

    expect(session('tbtop.locale'))->toBeNull();
});

it('locale endpoint rejects a missing locale', function () {
    $this->post('/admin/locale', [])
        ->assertSessionHasErrors(['locale']);
});

it('shared tbtop props contain locale, locales and messages', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $tbtop = $response->json('props.tbtop');
    expect($tbtop)->toHaveKey('locale')
        ->and($tbtop)->toHaveKey('locales')
        ->and($tbtop)->toHaveKey('messages')
        ->and($tbtop['locales'])->toBeArray()
        ->and($tbtop['messages'])->toBeArray();
});

it('shared props use the default locale when session is empty', function () {
    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $tbtop = $response->json('props.tbtop');
    expect($tbtop['locale'])->toBe('en');
});

it('shared props reflect the session locale when set', function () {
    session(['tbtop.locale' => 'uk']);

    $response = $this->get('/admin/posts/1/edit', ['X-Inertia' => 'true']);

    $response->assertOk();
    $tbtop = $response->json('props.tbtop');
    expect($tbtop['locale'])->toBe('uk');
});

it('localizes validation messages from the session locale on submit', function () {
    app('translator')->addLines(['validation.required' => 'Поле :attribute обов’язкове.'], 'uk');
    session(['tbtop.locale' => 'uk']);

    $response = $this->from('/admin/posts/1/edit')
        ->post('/admin/posts/1/edit/forms/post', []);

    $errors = session('errors')->get('title');
    expect($errors[0])->toContain('обов’язкове');
});
