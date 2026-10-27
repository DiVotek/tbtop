<?php

use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;

beforeEach(function () {
    $this->user = AuthUser::create([
        'name' => 'Olena',
        'email' => 'olena@example.com',
        'password' => Hash::make('old-password'),
        'remember_token' => 'old-remember-token',
    ]);
    AuthUser::create(['name' => 'Taras', 'email' => 'taras@example.com', 'password' => Hash::make('x')]);
});

function changePassword(string $current, string $new = 'brand-new-password'): TestResponse
{
    return test()->from('/admin/profile')->post('/admin/profile/forms/password', [
        'current_password' => $current,
        'password' => $new,
        'password_confirmation' => $new,
    ]);
}

it('sends a guest to the panel login', function () {
    $this->get('/admin/profile')->assertRedirect('/admin/login');
});

it('fills the profile form from the panel guard user', function () {
    $page = $this->actingAs($this->user, 'staff')->get('/admin/profile', ['X-Inertia' => 'true'])->assertOk()->json();

    expect(json_encode($page['props']))->toContain('"name":"Olena","email":"olena@example.com"')
        ->not->toContain('old-password');
});

it('leads the user menu with the profile page', function () {
    $items = $this->actingAs($this->user, 'staff')->get('/admin/nav-demo', ['X-Inertia' => 'true'])->json('props.tbtop.userMenuItems');

    expect($items[0])->toMatchArray(['label' => 'Profile', 'href' => '/admin/profile']);
});

it('saves the name and email', function () {
    $this->actingAs($this->user, 'staff')->from('/admin/profile')
        ->post('/admin/profile/forms/profile', ['name' => 'Olena K.', 'email' => 'olena.k@example.com'])
        ->assertSessionHasNoErrors();

    expect($this->user->fresh())->name->toBe('Olena K.')->email->toBe('olena.k@example.com');
});

it('refuses an email another user has', function () {
    $this->actingAs($this->user, 'staff')->from('/admin/profile')
        ->post('/admin/profile/forms/profile', ['name' => 'Olena', 'email' => 'taras@example.com'])
        ->assertSessionHasErrors('email');

    expect($this->user->fresh()->email)->toBe('olena@example.com');
});

it('changes the password and keeps a session that signed in through the login form', function () {
    $this->from('/admin/login')->post('/admin/login/forms/login', ['email' => 'olena@example.com', 'password' => 'old-password'])
        ->assertSessionHasNoErrors();
    $this->get('/admin/profile')->assertOk()->assertSessionHas('password_hash_staff');

    changePassword('old-password')->assertSessionHasNoErrors();

    expect(Hash::check('brand-new-password', $this->user->fresh()->password))->toBeTrue();
    $this->get('/admin/profile')->assertOk();
});

it('signs out another session that still carries the old password hash', function () {
    $this->actingAs($this->user, 'staff')->withSession(['password_hash_staff' => $this->user->password]);
    $this->user->forceFill(['password' => Hash::make('changed-elsewhere')])->save();

    $this->get('/admin/profile')->assertRedirect('/admin/login');
});

it('refuses a wrong current password and throttles after five', function () {
    $this->actingAs($this->user, 'staff');

    foreach (range(1, 5) as $_) {
        changePassword('wrong')->assertSessionHasErrors(['current_password' => __('auth.password')]);
    }
    changePassword('old-password')->assertSessionHasErrors('current_password');

    expect(Hash::check('old-password', $this->user->fresh()->password))->toBeTrue();
});

it('refuses a new password that does not match its confirmation', function () {
    $this->actingAs($this->user, 'staff')->from('/admin/profile')->post('/admin/profile/forms/password', [
        'current_password' => 'old-password',
        'password' => 'brand-new-password',
        'password_confirmation' => 'something-else',
    ])->assertSessionHasErrors('password');
});
