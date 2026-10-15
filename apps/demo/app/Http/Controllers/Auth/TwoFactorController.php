<?php

namespace App\Http\Controllers\Auth;

use App\Auth\TwoFactorVerifier;
use App\Http\Controllers\Controller;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function __construct(
        private readonly Google2FA $google2fa,
        private readonly TwoFactorVerifier $verifier,
    ) {}

    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        // Re-keying an enrolled account would bypass the current factor; disable (which needs a code) first.
        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => 'Two-factor authentication is already enabled.']);
        }

        $secret = $this->google2fa->generateSecretKey();
        // A new secret starts a fresh replay marker; the old secret's step must not reject its first code.
        $user->forceFill(['two_factor_secret' => encrypt($secret), 'two_factor_last_used_step' => null])->save();

        $qrSvg = $this->buildQrSvg($user->email, $secret);

        return response()->json([
            'qr_svg' => $qrSvg,
            'secret' => $secret,
        ]);
    }

    public function confirm(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();

        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => 'Two-factor authentication is already enabled.']);
        }

        if (! $user->two_factor_secret) {
            throw ValidationException::withMessages(['code' => 'Two-factor authentication setup not started.']);
        }

        $secret = decrypt($user->two_factor_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->input('code'));

        if (! $valid) {
            throw ValidationException::withMessages(['code' => 'Invalid verification code.']);
        }

        $recoveryCodes = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => encrypt(json_encode($recoveryCodes)),
        ])->save();

        \Log::info('auth.2fa.enabled', ['user_id' => $user->id]);

        return response()->json(['recovery_codes' => $recoveryCodes]);
    }

    public function disable(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages(['code' => 'Two-factor authentication is not enabled.']);
        }

        if ($this->verifier->isLockedOut($user)) {
            throw ValidationException::withMessages(['code' => $this->verifier->lockoutMessage($user)]);
        }

        if (! $this->verifier->verify($user, $request->input('code'))) {
            \Log::warning('auth.2fa.challenge_failed', ['user_id' => $user->id]);
            throw ValidationException::withMessages(['code' => 'Invalid code.']);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        \Log::info('auth.2fa.disabled', ['user_id' => $user->id]);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    /** @return list<string> */
    private function generateRecoveryCodes(): array
    {
        return collect(range(1, 10))
            ->map(fn () => Str::random(10).'-'.Str::random(10))
            ->all();
    }

    private function buildQrSvg(string $email, string $secret): string
    {
        $otpAuthUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $email,
            $secret,
        );

        $writer = new Writer(
            new ImageRenderer(
                new RendererStyle(200),
                new SvgImageBackEnd,
            )
        );

        return $writer->writeString($otpAuthUrl);
    }
}
