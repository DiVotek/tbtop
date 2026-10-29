<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\RateLimiter;
use LogicException;
use PragmaRX\Google2FA\Google2FA;
use Throwable;

/**
 * Checks a second-factor code: a 6-digit TOTP against the user's secret, else
 * a one-time recovery code, which it consumes. Failed codes are throttled per
 * user, and an accepted TOTP cannot be replayed within its window. Columns are
 * Fortify's (`two_factor_secret`, `two_factor_recovery_codes`,
 * `two_factor_confirmed_at`) plus `two_factor_last_used_step`, stored the same way.
 *
 * @internal
 */
final class TwoFactorCodes
{
    /** Failed codes allowed per user per minute. */
    private const int MAX_ATTEMPTS = 5;

    /** Whether the user finished enrolment; a pending secret alone does not count. */
    public static function isEnabled(Authenticatable|Model $user): bool
    {
        return $user instanceof Model && $user->getAttribute('two_factor_confirmed_at') !== null;
    }

    /** True for a valid TOTP or an unused recovery code (then consumed). Always false while locked out. */
    public static function verify(Model $user, string $code): bool
    {
        // hit() is an atomic increment: deciding on its result, not on a separate read,
        // keeps a parallel burst from getting more than MAX_ATTEMPTS codes checked.
        if (RateLimiter::hit(self::throttleKey($user)) > self::MAX_ATTEMPTS) {
            return false;
        }
        if (! self::acceptTotp($user, $code) && ! self::consumeRecoveryCode($user, $code)) {
            return false;
        }
        RateLimiter::clear(self::throttleKey($user));

        return true;
    }

    public static function isLockedOut(Model $user): bool
    {
        return RateLimiter::tooManyAttempts(self::throttleKey($user), self::MAX_ATTEMPTS);
    }

    public static function lockoutMessage(Model $user): string
    {
        return __('tbtop-admin::admin.auth.two_factor.throttle', ['seconds' => RateLimiter::availableIn(self::throttleKey($user))]);
    }

    /** True for a TOTP of the user's secret newer than the last accepted one; records its step. */
    public static function acceptTotp(Model $user, string $code): bool
    {
        $code = str_replace(' ', '', $code);
        $secret = $user->getAttribute('two_factor_secret');
        if (! ctype_digit($code) || strlen($code) !== 6 || ! is_string($secret)) {
            return false;
        }
        $google2fa = self::google2fa();
        try {
            $step = $google2fa->verifyKeyNewer(decrypt($secret), $code, (int) $user->getAttribute('two_factor_last_used_step'), null, self::currentStep($google2fa));
        } catch (Throwable) {
            return false;
        }

        return is_int($step) && self::recordUsedStep($user, $step);
    }

    /** @return list<string> The unused recovery codes. */
    public static function recoveryCodes(Model $user): array
    {
        $stored = $user->getAttribute('two_factor_recovery_codes');
        $codes = is_string($stored) ? json_decode((string) decrypt($stored), true) : [];

        return is_array($codes) ? array_values(array_filter($codes, is_string(...))) : [];
    }

    public static function google2fa(): Google2FA
    {
        if (! class_exists(Google2FA::class)) {
            throw new LogicException('Two-factor sign-in needs pragmarx/google2fa and bacon/bacon-qr-code: composer require pragmarx/google2fa bacon/bacon-qr-code');
        }

        return new Google2FA;
    }

    /** Conditional update, so two concurrent requests with the same code cannot both pass. */
    private static function recordUsedStep(Model $user, int $step): bool
    {
        $updated = $user->newQuery()->whereKey($user->getKey())
            ->where(fn ($query) => $query->whereNull('two_factor_last_used_step')->orWhere('two_factor_last_used_step', '<', $step))
            ->update(['two_factor_last_used_step' => $step]);
        if ($updated !== 1) {
            return false;
        }
        $user->setAttribute('two_factor_last_used_step', $step)->syncOriginalAttribute('two_factor_last_used_step');

        return true;
    }

    /** Google2FA reads microtime() itself; deriving the step from the app clock keeps it testable. */
    private static function currentStep(Google2FA $google2fa): int
    {
        return intdiv(now()->getTimestamp(), $google2fa->getKeyRegeneration());
    }

    private static function consumeRecoveryCode(Model $user, string $code): bool
    {
        $codes = self::recoveryCodes($user);
        $match = array_find_key($codes, static fn (string $stored): bool => hash_equals($stored, trim($code)));
        if ($match === null) {
            return false;
        }
        array_splice($codes, $match, 1);
        $remaining = encrypt(json_encode($codes));
        // Swap only if the list is still the one read, so one code cannot be redeemed twice concurrently.
        $updated = $user->newQuery()->whereKey($user->getKey())
            ->where('two_factor_recovery_codes', $user->getRawOriginal('two_factor_recovery_codes'))
            ->update(['two_factor_recovery_codes' => $remaining]);
        if ($updated !== 1) {
            return false;
        }
        $user->setAttribute('two_factor_recovery_codes', $remaining)->syncOriginalAttribute('two_factor_recovery_codes');

        return true;
    }

    private static function throttleKey(Model $user): string
    {
        return 'tbtop-two-factor|'.$user::class.'|'.$user->getKey();
    }
}
