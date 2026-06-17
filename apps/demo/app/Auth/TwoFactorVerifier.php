<?php

namespace App\Auth;

use App\Models\User;
use PragmaRX\Google2FA\Google2FA;

/**
 * Shared 2FA verification: checks a 6-digit TOTP against the user's secret,
 * else consumes a one-time recovery code. Used by the challenge controller,
 * the 2FA-disable flow, and the DSL challenge page so the rule lives once.
 */
class TwoFactorVerifier
{
    public function __construct(private readonly Google2FA $google2fa) {}

    /** True if $code is a valid TOTP or an unused recovery code (which it then consumes). */
    public function verify(User $user, string $code): bool
    {
        if ($this->isValidTotp($user, $code)) {
            return true;
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    private function isValidTotp(User $user, string $code): bool
    {
        if (! ctype_digit($code) || strlen($code) !== 6) {
            return false;
        }

        try {
            $secret = decrypt($user->two_factor_secret);

            return $this->google2fa->verifyKey($secret, $code);
        } catch (\Throwable) {
            return false;
        }
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
