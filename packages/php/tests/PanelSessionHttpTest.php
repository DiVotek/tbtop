<?php

use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Route;

// Two panels (see PanelsHttpTestCase): /admin on guard 'web', /ops on guard 'staff'.

function sessionUser(): AuthUser
{
    $user = new class extends AuthUser
    {
        protected $hidden = ['password', 'remember_token'];

        // Logout cycles the remember token through save(); there is no users table here.
        public function save(array $options = []): bool
        {
            return true;
        }
    };

    return $user->forceFill([
        'id' => 7,
        'email' => 'ops@example.com',
        'preferred_lang' => 'uk',
        'password' => 'secret-hash',
        'remember_token' => 'remember-me',
    ]);
}

it('logs out the panel guard, drops the session and lands on the panel root', function () {
    $this->actingAs(sessionUser(), 'staff');

    $this->withSession(['marker' => 'kept-before-logout'])
        ->post('/ops/logout')
        ->assertRedirect('/ops')
        ->assertSessionMissing('marker');

    $this->assertGuest('staff');
});

it('turns an expired-session logout into the redirect it was after', function () {
    $route = Route::getRoutes()->getByName('tbtop.ops.logout');
    $request = Request::create('/ops/logout', 'POST');
    $request->setRouteResolver(fn () => $route);

    $response = app(ExceptionHandler::class)->render($request, new TokenMismatchException);

    expect($response->getStatusCode())->toBe(302)
        ->and($response->headers->get('Location'))->toEndWith('/ops');
});

it('keeps a 419 outside the logout route', function () {
    $route = Route::getRoutes()->getByName('tbtop.ops.locale');
    $request = Request::create('/ops/locale', 'POST');
    $request->setRouteResolver(fn () => $route);

    $response = app(ExceptionHandler::class)->render($request, new TokenMismatchException);

    expect($response->getStatusCode())->toBe(419);
});

it('shares the panel guard user as the model serializes it', function () {
    $this->actingAs(sessionUser(), 'staff');

    $user = $this->get('/ops/nav-demo', ['X-Inertia' => 'true'])
        ->assertOk()
        ->json('props.tbtop.user');

    expect($user)->toBe(['id' => 7, 'email' => 'ops@example.com', 'preferred_lang' => 'uk']);
});

// Public pages skip `auth:{guard}`, so nothing switches the default guard to the panel's there.
it('shares the panel guard user on a public page of a non-default guard panel', function () {
    $this->actingAs(sessionUser(), 'staff');

    $this->get('/ops/public-login', ['X-Inertia' => 'true'])
        ->assertOk()
        ->assertJsonPath('props.tbtop.user.email', 'ops@example.com');
});

it('does not share a user signed in on another guard', function () {
    $this->actingAs(sessionUser(), 'web');

    $this->get('/ops/public-login', ['X-Inertia' => 'true'])
        ->assertOk()
        ->assertJsonPath('props.tbtop.user', null);
});
