<?php

use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tbtop\Admin\Auth\VerifyEmailNotification;
use Tbtop\Admin\Tests\Fixtures\Auth\AuthUser;
use Tbtop\Admin\Tests\Fixtures\Auth\VerifyingUser;

beforeEach(function () {
    config(['auth.providers.users.model' => VerifyingUser::class]);
    $this->user = VerifyingUser::create([
        'name' => 'Olena',
        'email' => 'olena@example.com',
        'password' => Hash::make('secret-password'),
    ]);
});

function verifyLink(VerifyingUser $user, ?string $email = null): string
{
    return URL::temporarySignedRoute('tbtop.admin.email-verification-page.verify', now()->addHour(), [
        'id' => $user->getKey(),
        'hash' => sha1($email ?? $user->email),
    ]);
}

it('sends an unverified user to the verification page from every other panel page', function () {
    $this->actingAs($this->user, 'staff')->get('/admin/nav-demo')->assertRedirect('/admin/verify-email');
    $this->get('/admin/verify-email', ['X-Inertia' => 'true'])->assertOk();
});

it('answers a JSON request from an unverified user with 403', function () {
    $this->actingAs($this->user, 'staff')->getJson('/admin/nav-demo')->assertForbidden();
});

it('lets a verified user through', function () {
    $this->user->markEmailAsVerified();
    $this->actingAs($this->user, 'staff')->get('/admin/nav-demo')->assertOk();
});

// One user per test: AuthenticateSession ends a session that switches users mid-test.
it('lets a user without MustVerifyEmail through', function () {
    $plain = AuthUser::create(['name' => 'Taras', 'email' => 'taras@example.com', 'password' => Hash::make('x')]);
    $this->actingAs($plain, 'staff')->get('/admin/nav-demo')->assertOk();
});

it('keeps the profile and logout reachable for an unverified user', function () {
    $this->actingAs($this->user, 'staff')->get('/admin/profile')->assertOk();
    $this->post('/admin/logout')->assertRedirect('/admin');
    $this->assertGuest('staff');
});

it('mails a signed link to the panel verify route', function () {
    Notification::fake();

    $this->actingAs($this->user, 'staff')->postJson('/admin/verify-email/actions/send', ['payload' => []])
        ->assertOk()
        ->assertJsonPath('effects.0.kind', 'notify');

    Notification::assertSentTo($this->user, VerifyEmailNotification::class, function (VerifyEmailNotification $mail): bool {
        return str_contains($mail->url, '/admin/verify-email/'.$this->user->getKey().'/'.sha1('olena@example.com'))
            && str_contains($mail->url, 'signature=');
    });
});

it('throttles link requests per user', function () {
    Notification::fake();
    $this->actingAs($this->user, 'staff');
    foreach (range(1, 6) as $_) {
        $this->postJson('/admin/verify-email/actions/send', ['payload' => []])->assertJsonPath('effects.0.level', 'success');
    }

    $this->postJson('/admin/verify-email/actions/send', ['payload' => []])->assertJsonPath('effects.0.level', 'error');
    Notification::assertSentToTimes($this->user, VerifyEmailNotification::class, 6);
});

it('verifies the email from the signed link and returns to the page the user was sent away from', function () {
    Event::fake([Verified::class]);
    $this->actingAs($this->user, 'staff')->get('/admin/nav-demo');

    $this->get(verifyLink($this->user))->assertRedirect('/admin/nav-demo');

    expect($this->user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
    $this->get('/admin/nav-demo')->assertOk();
});

it('rejects an unsigned link and a link for an old email', function () {
    $this->actingAs($this->user, 'staff');
    $this->get('/admin/verify-email/'.$this->user->getKey().'/'.sha1($this->user->email))->assertForbidden();
    $this->get(verifyLink($this->user, 'old@example.com'))->assertForbidden();

    expect($this->user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects a link opened in another user\'s session', function () {
    $other = VerifyingUser::create(['name' => 'Taras', 'email' => 'taras@example.com', 'password' => Hash::make('x')]);
    $this->actingAs($other, 'staff')->get(verifyLink($this->user))->assertForbidden();

    expect($this->user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('sends a guest who opens the link to the login first', function () {
    $this->get(verifyLink($this->user))->assertRedirect('/admin/login');
});

it('marks a changed email unverified and mails a link to the new address', function () {
    Notification::fake();
    $this->user->markEmailAsVerified();

    $this->actingAs($this->user, 'staff')->from('/admin/profile')->post('/admin/profile/forms/profile', [
        'name' => 'Olena',
        'email' => 'new@example.com',
        'current_password' => 'secret-password',
    ])->assertRedirect('/admin/profile');

    expect($this->user->fresh()->hasVerifiedEmail())->toBeFalse();
    Notification::assertSentTo($this->user, VerifyEmailNotification::class, function (VerifyEmailNotification $mail): bool {
        return str_contains($mail->url, sha1('new@example.com'));
    });
});
