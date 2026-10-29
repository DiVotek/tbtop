<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Facades\Auth;

/**
 * What the session knows about a panel guard's second factor: the sign-in
 * parked between password and code, and which user passed the challenge.
 * The pass names the user, so it never carries over to another account, and
 * a session restored from a remember cookie has none and is challenged again.
 *
 * @internal
 */
final readonly class TwoFactorSession
{
    private const string PENDING = 'tbtop_two_factor.pending';

    private const string PASSED = 'tbtop_two_factor.passed';

    /** How long a parked sign-in waits for its code before the password is needed again. */
    private const int PARKED_SECONDS = 600;

    public function __construct(private Session $session, private string $guard) {}

    /** Holds a password-checked user, not yet signed in, until the challenge passes. */
    public function park(Authenticatable $user, bool $remember): void
    {
        $this->session->put(self::PENDING, [
            'guard' => $this->guard,
            'id' => $user->getAuthIdentifier(),
            'remember' => $remember,
            'at' => now()->getTimestamp(),
            'hash' => $this->passwordHash($user),
        ]);
    }

    /**
     * The parked user, while the sign-in is under ten minutes old and their
     * password has not changed since: AuthenticateSession guards only
     * signed-in sessions, so a reset elsewhere has to end a parked one here.
     */
    public function parkedUser(): ?Authenticatable
    {
        $pending = $this->session->get(self::PENDING);
        if (! is_array($pending) || ($pending['guard'] ?? null) !== $this->guard || now()->getTimestamp() - (int) ($pending['at'] ?? 0) > self::PARKED_SECONDS) {
            return null;
        }
        $user = Auth::createUserProvider(config("auth.guards.{$this->guard}.provider"))?->retrieveById($pending['id']);

        return $user !== null && hash_equals((string) ($pending['hash'] ?? ''), $this->passwordHash($user)) ? $user : null;
    }

    /**
     * Who owes a code: the parked user, else a signed-in user with a second
     * factor who has not passed it in this session (a remember cookie signed them in).
     */
    public function challengedUser(): ?Authenticatable
    {
        $user = $this->parkedUser() ?? Auth::guard($this->guard)->user();

        return $user !== null && TwoFactorCodes::isEnabled($user) && ! $this->hasPassed($user) ? $user : null;
    }

    public function remembers(): bool
    {
        return (bool) ($this->session->get(self::PENDING)['remember'] ?? false);
    }

    public function forgetParked(): void
    {
        $this->session->forget(self::PENDING);
    }

    public function pass(Authenticatable $user): void
    {
        $this->session->put(self::PASSED.'.'.$this->guard, $this->identity($user));
    }

    public function hasPassed(Authenticatable $user): bool
    {
        return $this->session->get(self::PASSED.'.'.$this->guard) === $this->identity($user);
    }

    /** A digest, not the hash itself, so the session never holds the user's password hash. */
    private function passwordHash(Authenticatable $user): string
    {
        return hash_hmac('sha256', (string) $user->getAuthPassword(), (string) config('app.key'));
    }

    private function identity(Authenticatable $user): string
    {
        return $user::class.'|'.$user->getAuthIdentifier();
    }
}
