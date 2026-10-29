<?php

namespace Tbtop\Admin\Auth\TwoFactor;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Turning a user's second factor on and off: a new secret waits unconfirmed
 * until the first code from the authenticator app proves it was scanned, and
 * confirming issues the recovery codes. Same storage as TwoFactorCodes.
 *
 * @internal
 */
final class TwoFactorEnrollment
{
    private const int RECOVERY_CODES = 8;

    /** Stores a fresh unconfirmed secret; a second factor already on is left alone. */
    public static function start(Model $user): void
    {
        if (TwoFactorCodes::isEnabled($user)) {
            return;
        }
        // A new secret starts a fresh replay marker; the old secret's step must not reject its first code.
        $user->forceFill([
            'two_factor_secret' => encrypt(TwoFactorCodes::google2fa()->generateSecretKey()),
            'two_factor_recovery_codes' => null,
            'two_factor_last_used_step' => null,
        ])->save();
    }

    /** The unconfirmed secret, or null when enrolment has not started or already finished. */
    public static function pendingSecret(Model $user): ?string
    {
        $secret = $user->getAttribute('two_factor_secret');
        if (TwoFactorCodes::isEnabled($user) || ! is_string($secret)) {
            return null;
        }

        return (string) decrypt($secret);
    }

    /** The authenticator-app QR code for $secret as an SVG data URI. */
    public static function qrCode(Model $user, string $secret): string
    {
        $url = TwoFactorCodes::google2fa()->getQRCodeUrl((string) config('app.name'), (string) ($user->getAttribute('email') ?? $user->getKey()), $secret);
        $svg = (new Writer(new ImageRenderer(new RendererStyle(192, 1), new SvgImageBackEnd)))->writeString($url);

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    /**
     * Turns the second factor on when $code matches the pending secret.
     *
     * @return list<string>|null The new recovery codes, or null for a wrong code.
     */
    public static function confirm(Model $user, string $code): ?array
    {
        if (self::pendingSecret($user) === null || ! TwoFactorCodes::acceptTotp($user, $code)) {
            return null;
        }
        $codes = self::newRecoveryCodes();
        $user->forceFill(['two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => encrypt(json_encode($codes))])->save();

        return $codes;
    }

    /** @return list<string> */
    public static function regenerateRecoveryCodes(Model $user): array
    {
        $codes = self::newRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => encrypt(json_encode($codes))])->save();

        return $codes;
    }

    /** Drops the secret and the recovery codes, confirmed or still pending. */
    public static function disable(Model $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_last_used_step' => null,
        ])->save();
    }

    /** @return list<string> Fortify's shape: two random halves of ten characters. */
    private static function newRecoveryCodes(): array
    {
        return array_map(static fn (): string => Str::random(10).'-'.Str::random(10), range(1, self::RECOVERY_CODES));
    }
}
