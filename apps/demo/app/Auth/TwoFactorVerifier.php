<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use PragmaRX\Google2FA\Google2FA;

/**
 * Shared 2FA verification: checks a 6-digit TOTP against the user's secret,
 * else consumes a one-time recovery code. Used by the 2FA-disable flow and
 * the DSL challenge page so the rule lives once. Failed codes are throttled
 * per user, and an accepted TOTP cannot be replayed within its window.
 */
class TwoFactorVerifier
{
    /** Failed codes allowed per user per minute. */
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly Google2FA $google2fa) {}

    /** True if $code is a valid TOTP or an unused recovery code (which it then consumes). Always false while locked out. */
    public function verify(User $user, string $code): bool
    {
        if ($this->isLockedOut($user)) {
            return false;
        }

        if ($this->acceptTotp($user, $code) || $this->consumeRecoveryCode($user, $code)) {
            RateLimiter::clear($this->throttleKey($user));

            return true;
        }

        RateLimiter::hit($this->throttleKey($user));

        return false;
    }

    public function isLockedOut(User $user): bool
    {
        return RateLimiter::tooManyAttempts($this->throttleKey($user), self::MAX_ATTEMPTS);
    }

    public function lockoutMessage(User $user): string
    {
        $seconds = RateLimiter::availableIn($this->throttleKey($user));

        return __('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)]);
    }

    private function throttleKey(User $user): string
    {
        return 'two-factor|'.$user->getKey();
    }

    private function acceptTotp(User $user, string $code): bool
    {
        if (! ctype_digit($code) || strlen($code) !== 6) {
            return false;
        }

        try {
            $step = $this->google2fa->verifyKeyNewer(
                decrypt($user->two_factor_secret),
                $code,
                $user->two_factor_last_used_step ?? 0,
                null,
                $this->currentStep(),
            );
        } catch (\Throwable) {
            return false;
        }

        return $step !== false && $this->recordUsedStep($user, (int) $step);
    }

    /** Conditional update, so two concurrent requests with the same code cannot both pass. */
    private function recordUsedStep(User $user, int $step): bool
    {
        $updated = User::whereKey($user->getKey())
            ->where(fn ($query) => $query->whereNull('two_factor_last_used_step')
                ->orWhere('two_factor_last_used_step', '<', $step))
            ->update(['two_factor_last_used_step' => $step]);

        if ($updated !== 1) {
            return false;
        }

        $user->setAttribute('two_factor_last_used_step', $step)->syncOriginalAttribute('two_factor_last_used_step');

        return true;
    }

    /** Google2FA reads microtime() itself; deriving the step from the app clock keeps it testable. */
    private function currentStep(): int
    {
        return intdiv(now()->getTimestamp(), $this->google2fa->getKeyRegeneration());
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = json_decode(decrypt($user->two_factor_recovery_codes), true);
        $index = array_search($code, $codes, true);

        if ($index === false) {
            return false;
        }

        array_splice($codes, (int) $index, 1);
        $user->forceFill(['two_factor_recovery_codes' => encrypt(json_encode($codes))])->save();

        \Log::info('auth.2fa.recovery_code_used', ['user_id' => $user->id]);

        return true;
    }
}
